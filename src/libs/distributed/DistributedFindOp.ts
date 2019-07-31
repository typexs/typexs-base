import * as _ from 'lodash';
import {DistributedStorageEntityController} from './DistributedStorageEntityController';
import {EventBus, subscribe} from 'commons-eventbus';
import {IFindOp} from '../storage/framework/IFindOp';
import {TypeOrmEntityRegistry} from '../storage/framework/typeorm/schema/TypeOrmEntityRegistry';
import {EventEmitter} from 'events';
import {System} from '../system/System';
import {IEntityRef} from 'commons-schema-api';
import {IWorkerInfo} from '../worker/IWorkerInfo';
import {DistributedQueryWorker} from '../../workers/DistributedQueryWorker';
import {Log} from '../logging/Log';
import {C_WORKERS} from '../worker/Constants';
import {XS_P_$COUNT, XS_P_$LIMIT, XS_P_$OFFSET} from '../Constants';
import {DistributedQueryResultsEvent} from './DistributedQueryResultsEvent';
import {DistributedQueryEvent} from './DistributedQueryEvent';
import {IDistributedFindOptions} from './IDistributedFindOptions';


export class DistributedFindOp<T> extends EventEmitter implements IFindOp<T> {

  private system: System;

  // private controller: DistributedStorageEntityController;

  private options: IDistributedFindOptions;

  private timeout = 10000;

  private targetIds: string[] = [];

  private queryEvent: DistributedQueryEvent = new DistributedQueryEvent();

  private queryResults: DistributedQueryResultsEvent[] = [];

  private entityRef: IEntityRef;

  private results: any[] = [];

  private active = true;

  private start: Date;

  private stop: Date;

  constructor(system: System) {
    super();
    this.system = system;
    this.once('postprocess', this.postProcess.bind(this));
  }

  prepare(controller: DistributedStorageEntityController) {
    // this.controller = controller;

    return this;
  }


  @subscribe(DistributedQueryResultsEvent)
  onResults(event: DistributedQueryResultsEvent) {
    if (!this.active) {
      return;
    }

    // has query event
    if (!this.queryEvent) {
      return;
    }

    // check if response is mine
    if (this.queryEvent.queryId !== event.queryId) {
      return;
    }

    // results for me?
    if (event.targetIds.indexOf(this.system.node.nodeId) === -1) {
      return;
    }

    // waiting for the results?
    if (this.targetIds.indexOf(event.nodeId) === -1) {
      return;
    }
    _.remove(this.targetIds, x => x === event.nodeId);

    if (!event.forbidden) {
      event.results.map(r => r.__nodeId__ = event.nodeId);
      this.queryResults.push(event);
    }

    if (this.targetIds.length === 0) {
      this.active = false;
      this.emit('postprocess');
    }

  }


  async run(entityType: Function | string, findConditions?: any, options?: IDistributedFindOptions): Promise<T[]> {
    _.defaults(options, {
      limit: 50,
      offset: null,
      sort: null,
      timeout: 10000
    });
    this.options = options;
    this.timeout = this.options.timeout;


    this.entityRef = TypeOrmEntityRegistry.$().getEntityRefFor(entityType);


    this.queryEvent.nodeId = this.system.node.nodeId;
    this.queryEvent.entityType = this.entityRef.name;
    this.queryEvent.conditions = findConditions;
    this.queryEvent.options = options;


    // also fire self
    this.targetIds = this.system.getNodesWith(C_WORKERS)
      .filter(n => n.contexts
        .find(c => c.context === C_WORKERS).workers
        .find((w: IWorkerInfo) => w.className === DistributedQueryWorker.name))
      .map(n => n.nodeId);

    if (this.options.targetIds) {
      this.targetIds = _.intersection(this.targetIds, this.options.targetIds);
    }

    if (this.targetIds.length === 0) {
      throw new Error('no distributed worker found to execute the query.');
    }

    // this.targetIds = [this.system.node.nodeId];
    // this.system.nodes.forEach(x => {
    //   if (!x.isBackend) {
    //     this.targetIds.push(x.nodeId);
    //   }
    // });

    this.queryEvent.targetIds = this.targetIds;
    if (this.targetIds.length === 0) {
      return this.results;
    }


    // register as bus
    await EventBus.register(this);
    Log.debug('fire query event with id: ' + this.queryEvent.queryId + ' to targets ' + this.targetIds.join(', '));
    try {
      this.start = new Date();
      const ready = this.ready();
      await EventBus.postAndForget(this.queryEvent);
      await ready;
    } catch (err) {
      Log.error(err);
    }

    await EventBus.unregister(this);
    this.removeAllListeners();
    return this.results;
  }


  postProcess(err: Error) {
    this.stop = new Date();
    let count = 0;
    this.queryResults.map(x => {
      count += x.count;
    });

    if (_.get(this.options, 'raw', false)) {
      this.results = _.concat([], ...this.queryResults.map(x => x.results)).map(x => {
        const e = this.entityRef.create();
        _.assign(e, x);
        return e;
      });
    } else {
      this.results = _.concat([], ...this.queryResults.map(x => x.results))
        .map(r => this.entityRef.build(r, {
          afterBuild: (c: any, f: any, t: any) => _.keys(f)
            .filter(k => k.startsWith('__'))
            .map(k => t[k] = f[k])
        }));
    }

    if (_.get(this.queryEvent.options, 'sort', false)) {
      const arr: string[][] = [];
      // order after concat
      _.keys(this.queryEvent.options.sort).forEach(k => {
        arr.push([k, this.queryEvent.options.sort[k].toUpperCase() === 'ASC' ? 'asc' : 'desc']);
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
        this.emit('postprocess', new Error('timeout error [' + this.timeout +
          '] after duration of ' + (Date.now() - this.start.getTime()) + 'ms'));
        clearTimeout(t);
      }, this.timeout);

      this.once('finished', (err: Error, data: any) => {
        Log.debug('finished query event with id: ' + this.queryEvent.queryId +
          ' duration=' + (this.stop.getTime() - this.start.getTime()) + 'ms');

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

    });
  }

}


