import * as _ from 'lodash'
import {DistributedStorageEntityController} from "./DistributedStorageEntityController";
import subscribe from "commons-eventbus/decorator/subscribe";
import {QueryResultsEvent} from "./QueryResultsEvent";
import {EventBus} from "commons-eventbus";
import {IFindOp} from "../storage/framework/IFindOp";
import {IFindOptions, Log, XS_P_$COUNT, XS_P_$LIMIT, XS_P_$OFFSET} from "../..";
import {TypeOrmEntityRegistry} from '../storage/framework/typeorm/schema/TypeOrmEntityRegistry';
import {QueryEvent} from "./QueryEvent";
import {EventEmitter} from "events";
import {Container, Inject} from "typedi";
import {System} from "../system/System";
import {IEntityRef} from "commons-schema-api";


export class DistributedFindOp<T> extends EventEmitter implements IFindOp<T> {

  private system: System;

  private controller: DistributedStorageEntityController;

  private options: IFindOptions;

  private timeout: number = 5000;

  private targetIds: string[] = [];

  private queryEvent: QueryEvent = new QueryEvent();

  private queryResults: QueryResultsEvent[] = [];

  private entityRef: IEntityRef;

  private results: any[] = [];

  private active: boolean = true;


  constructor(system: System) {
    super();
    this.system = system;
    this.once('postprocess', this.postProcess.bind(this));
  }

  prepare(controller: DistributedStorageEntityController) {
    this.controller = controller;

    return this;
  }


  @subscribe(QueryResultsEvent)
  onResults(event: QueryResultsEvent) {
    if (!this.active) return;

    // has query event
    if (!this.queryEvent) return;

    Log.debug('receive distributed find results: ', event);
    // check if response is mine
    if (this.queryEvent.queryId != event.queryId) return;

    // results for me?
    if (event.targetIds.indexOf(this.system.node.nodeId) == -1) return;

    // waiting for the results?
    if (this.targetIds.indexOf(event.nodeId) == -1) return;
    _.remove(this.targetIds, x => x == event.nodeId);

    event.results.map(r => r.__nodeId__ = event.nodeId);
    this.queryResults.push(event);

    if (this.targetIds.length == 0) {
      this.active = false;
      this.emit('postprocess')
    }

  }


  async run(entityType: Function | string, findConditions?: any, options?: IFindOptions): Promise<T[]> {
    _.defaults(options, {
      limit: 50,
      offset: null,
      sort: null
    });
    this.options = options;

    this.entityRef = TypeOrmEntityRegistry.$().getEntityRefFor(entityType);


    this.queryEvent.nodeId = this.system.node.nodeId;
    this.queryEvent.entityType = this.entityRef.name;
    this.queryEvent.conditions = findConditions;
    this.queryEvent.options = options;


    // also fire self
    this.targetIds = [this.system.node.nodeId];
    this.system.nodes.forEach(x => {
      if (!x.isBackend) {
        this.targetIds.push(x.nodeId);
      }
    });

    this.queryEvent.targetIds = this.targetIds;
    if (this.targetIds.length == 0) {
      return this.results;
    }


    // register as bus
    await EventBus.register(this);
    Log.debug('fire query event with id: ' + this.queryEvent.queryId);
    await EventBus.postAndForget(this.queryEvent);
    try {
      await this.ready();
    } catch (err) {
      Log.error(err);
    }

    await EventBus.unregister(this);
    return this.results;
  }


  postProcess(err: Error) {
    let count = 0;
    this.queryResults.map(x => {
      count += x.count;
    });
    this.results = _.concat([], ...this.queryResults.map(x => x.results))
      .map(r => this.entityRef.build(r, {
        afterBuild: (c: any, f: any, t: any) => _.keys(f)
          .filter(k => k.startsWith('__'))
          .map(k => t[k] = f[k])
      }));

    if (_.get(this.queryEvent.options, 'sort', false)) {
      let arr: string[][] = [];
      // order after concat
      _.keys(this.queryEvent.options.sort).forEach(k => {
        arr.push([k, this.queryEvent.options.sort[k].toUpperCase() == 'ASC' ? 'asc' : 'desc']);
      });
      _.orderBy(this.results, ...arr);
    }

    this.results[XS_P_$COUNT] = count;
    this.results[XS_P_$LIMIT] = this.options.limit;
    this.results[XS_P_$OFFSET] = this.options.offset;

    this.emit('finished', err, this.results);
  }


  ready() {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.emit('postprocess', new Error('timeout error'));
        clearTimeout(t);
      }, this.timeout);

      this.once('finished', (err: Error, data: any) => {
        clearTimeout(t);
        if (err) {
          Log.error(err);
          if (data) {
            resolve(data);
          } else {
            reject(err);
          }
        } else {
          resolve(data);
        }
      });

    })
  }

}


