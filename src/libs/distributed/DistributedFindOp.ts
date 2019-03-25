import * as _ from 'lodash'
import {DistributedStorageEntityController} from "./DistributedStorageEntityController";
import subscribe from "commons-eventbus/decorator/subscribe";
import {QueryResultsEvent} from "./QueryResultsEvent";
import {EventBus} from "commons-eventbus";
import {IFindOp} from "../storage/framework/IFindOp";
import {IFindOptions, Log} from "../..";
import {TypeOrmEntityRegistry} from '../storage/framework/typeorm/schema/TypeOrmEntityRegistry';
import {QueryEvent} from "./QueryEvent";
import {EventEmitter} from "events";
import {Inject} from "typedi";
import {System} from "../system/System";
import {IEntityRef} from "commons-schema-api";


export class DistributedFindOp<T> extends EventEmitter implements IFindOp<T> {

  @Inject(System.NAME)
  private system: System;

  private controller: DistributedStorageEntityController;

  private options: IFindOptions;

  private timeout: number = 5000;

  private targetIds: string[] = [];

  private queryEvent: QueryEvent;

  private queryResults: QueryResultsEvent[] = [];

  private entityRef: IEntityRef;

  private results: any[] = [];


  constructor() {
    super();

  }


  prepare(controller: DistributedStorageEntityController) {
    this.controller = controller;
    return this;
  }


  @subscribe(QueryResultsEvent)
  onResults(event: QueryResultsEvent) {
    Log.debug('recieve results', event, this.queryEvent);

    // has query event
    if (!this.queryEvent) return;

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

      this.results = _.concat([], ...this.queryResults.map(x => x.results))
        .map(r => this.entityRef.build(r,{
          afterBuild:(c:any,f:any,t:any) => _.keys(f)
            .filter(k => k.startsWith('__'))
            .map(k => t[k] = f[k])
        }));

      if (this.queryEvent.sort) {
        let arr: string[][] = [];

        // order after concat
        _.keys(this.queryEvent.sort).forEach(k => {
          arr.push([k, this.queryEvent.sort[k].toUpperCase() == 'ASC' ? 'asc' : 'desc']);
        });


        _.orderBy(this.results, ...arr);
      }

      this.emit('finished', null, this.results)
    }

  }


  async run(entityType: Function | string, findConditions?: any, options?: IFindOptions): Promise<T[]> {
    _.defaults(options, {
      limit: 50,
      offset: null,
      sort: null
    });



    this.entityRef = TypeOrmEntityRegistry.$().getEntityRefFor(entityType);

    this.queryEvent = new QueryEvent();
    this.queryEvent.nodeId = this.system.node.nodeId;

    this.queryEvent.entityType = this.entityRef.name;
    this.options = options;

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

    Log.debug('fire query request', this.queryEvent);

    // register as bus
    await EventBus.register(this);
    await EventBus.postAndForget(this.queryEvent);


    await this.ready();
    await EventBus.unregister(this);
    return this.results;
  }


  ready() {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        reject(new Error('timeout error'))
      }, this.timeout);

      this.once('finished', (err: Error, data: any) => {
        clearTimeout(t);
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });

    })
  }

}


