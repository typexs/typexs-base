import {QueryEvent} from "./../libs/distributed/QueryEvent";
import subscribe from "commons-eventbus/decorator/subscribe";
import {AsyncWorkerQueue, IAsyncQueueOptions, IFindOptions, IQueueProcessor, IQueueWorkload, Log} from "..";
import {Bootstrap} from './../Bootstrap';
import {Storage} from '../libs/storage/Storage';
import {EventBus} from "commons-eventbus";
import {TypeOrmEntityRegistry} from './../libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry'
import {Inject} from "typedi";
import {System} from "../libs/system/System";
import {IEntityRef} from "commons-schema-api";
import {QueryResultsEvent} from "./../libs/distributed/QueryResultsEvent";
import {IWorker} from "../libs/worker/IWorker";


export interface IQueryWorkload extends IQueueWorkload {
  entityRef: IEntityRef;
  event: QueryEvent;
}

export class DistributedQueryWorker implements IQueueProcessor<IQueryWorkload>, IWorker {

  @Inject(System.NAME)
  private system: System;


  @Inject(Storage.NAME)
  private storage: Storage;

  nodeId: string;

  queue: AsyncWorkerQueue<IQueryWorkload>;


  async prepare(options: IAsyncQueueOptions = {name: 'queryworkerqueue'}) {
    this.nodeId = Bootstrap.getNodeId();
    this.queue = new AsyncWorkerQueue<IQueryWorkload>(this, options);
    await EventBus.register(this);
    Log.debug('Distributed queue worker: waiting for requests ...');
  }


  @subscribe(QueryEvent)
  onQueryEvent(event: QueryEvent) {
    try {

      // check if its for me
      if (event.targetIds && event.targetIds.indexOf(this.system.node.nodeId) == -1) {
        return;
      }

      let entityRef = TypeOrmEntityRegistry.$().getEntityRefFor(event.entityType);
      if (!entityRef) {
        // no entity ref
        let resultsEvent = this.createResultEvent(event);
        resultsEvent.error = 'entity ref not found';
        resultsEvent.results = [];
        EventBus.post(resultsEvent);
        return;
      }

      let q: IQueryWorkload = {
        entityRef: entityRef,
        event: event
      };
      this.queue.push(q);
    } catch (err) {
      let resultsEvent = this.createResultEvent(event);
      resultsEvent.queryId = event.queryId;
      resultsEvent.error = err.message;
      resultsEvent.results = [];
      EventBus.post(resultsEvent);
      Log.error(err);
    }
  }


  createResultEvent(event: QueryEvent) {
    let resultsEvent = new QueryResultsEvent();
    resultsEvent.queryId = event.queryId;
    resultsEvent.respId = this.system.node.nodeId;
    resultsEvent.nodeId = this.system.node.nodeId;
    resultsEvent.targetIds = [event.nodeId];
    return resultsEvent;
  }


  async do(workLoad: IQueryWorkload, queue?: AsyncWorkerQueue<any>): Promise<any> {
    // execute query
    // workLoad.event.
    let o = workLoad.event;
    let resultsEvent = this.createResultEvent(o);
    resultsEvent.results = [];

    try {
      let classRef = workLoad.entityRef.getClassRef();
      let entry = this.storage.forClass(classRef);

      let opts: IFindOptions = {};
      if (o.limit) {
        opts.limit = o.limit;
      }
      if (o.offset) {
        opts.offset = o.offset;
      }
      if (o.sort) {
        opts.sort = o.sort;
      }

      resultsEvent.results = await entry.getController().find(
        classRef.getClass(),
        workLoad.event.conditions,
        opts
      );

    } catch (err) {
      resultsEvent.error = err.message;
    }


    // fire query results
    EventBus.postAndForget(resultsEvent);
  }

  finish(): void {
    this.queue.removeAllListeners();
  }


}
