import {QueryEvent} from './../libs/distributed/QueryEvent';
import {EventBus, subscribe} from 'commons-eventbus';
import {XS_P_$COUNT, XS_P_$LIMIT, XS_P_$OFFSET} from '../libs/Constants';
import {Storage} from '../libs/storage/Storage';
import {Bootstrap} from './../Bootstrap';
import {TypeOrmEntityRegistry} from './../libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry';
import {Inject} from 'typedi';
import {System} from '../libs/system/System';
import {IEntityRef} from 'commons-schema-api';
import {QueryResultsEvent} from './../libs/distributed/QueryResultsEvent';
import {IWorker} from '../libs/worker/IWorker';
import {IWorkerStatisitic} from '../libs/worker/IWorkerStatisitic';
import {IQueueWorkload} from '../libs/queue/IQueueWorkload';
import {IQueueProcessor} from '../libs/queue/IQueueProcessor';
import {AsyncWorkerQueue} from '../libs/queue/AsyncWorkerQueue';
import {IAsyncQueueOptions} from '../libs/queue/IAsyncQueueOptions';
import {Log} from '../libs/logging/Log';
import {IFindOptions} from '../libs/storage/framework/IFindOptions';


export interface IQueryWorkload extends IQueueWorkload {
  entityRef: IEntityRef;
  event: QueryEvent;
}

export class DistributedQueryWorker implements IQueueProcessor<IQueryWorkload>, IWorker {

  @Inject(System.NAME)
  private system: System;


  @Inject(Storage.NAME)
  private storage: Storage;


  name = 'distributed_query_worker';

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
      if (event.targetIds && event.targetIds.indexOf(this.system.node.nodeId) === -1) {
        return;
      }

      const entityRef = TypeOrmEntityRegistry.$().getEntityRefFor(event.entityType);
      if (!entityRef) {
        // no entity ref
        const resultsEvent = this.createResultEvent(event);
        resultsEvent.error = 'entity ref not found';
        resultsEvent.results = [];
        EventBus.post(resultsEvent);
        return;
      }

      const q: IQueryWorkload = {
        entityRef: entityRef,
        event: event
      };
      this.queue.push(q);
    } catch (err) {
      const resultsEvent = this.createResultEvent(event);
      resultsEvent.queryId = event.queryId;
      resultsEvent.error = err.message;
      resultsEvent.results = [];
      EventBus.post(resultsEvent);
      Log.error(err);
    }
  }


  createResultEvent(event: QueryEvent) {
    const resultsEvent = new QueryResultsEvent();
    resultsEvent.queryId = event.queryId;
    resultsEvent.respId = this.system.node.nodeId;
    resultsEvent.nodeId = this.system.node.nodeId;
    resultsEvent.targetIds = [event.nodeId];
    return resultsEvent;
  }


  async do(workLoad: IQueryWorkload, queue?: AsyncWorkerQueue<any>): Promise<any> {
    // execute query
    // workLoad.event.
    const o = workLoad.event;
    const resultsEvent = this.createResultEvent(o);
    resultsEvent.results = [];

    try {
      const classRef = workLoad.entityRef.getClassRef();
      const entry = this.storage.forClass(classRef);
      const opts: IFindOptions = o.options;

      resultsEvent.results = await entry.getController().find(
        classRef.getClass(),
        workLoad.event.conditions,
        opts
      );

      resultsEvent.count = resultsEvent.results[XS_P_$COUNT];
      resultsEvent.limit = resultsEvent.results[XS_P_$LIMIT];
      resultsEvent.offset = resultsEvent.results[XS_P_$OFFSET];
      Log.debug('distributed query worker:  found ' + resultsEvent.count +
        ' entries for ' + classRef.name + '[qId: ' + resultsEvent.queryId + ']');
    } catch (err) {
      resultsEvent.error = err.message;
      Log.error(err);
    }


    // fire query results
    EventBus.postAndForget(resultsEvent);
  }


  statistic(): IWorkerStatisitic {
    const stats: IWorkerStatisitic = {
      stats: this.queue.status(),
      paused: this.queue.isPaused(),
      idle: this.queue.isIdle(),
      occupied: this.queue.isOccupied(),
      running: this.queue.isPaused(),
    };

    return stats;
  }


  async finish() {
    await EventBus.unregister(this);
    this.queue.removeAllListeners();
  }


}
