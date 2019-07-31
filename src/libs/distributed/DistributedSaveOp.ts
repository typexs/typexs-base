import * as _ from 'lodash';
import {DistributedStorageEntityController} from './DistributedStorageEntityController';
import {EventBus, subscribe} from 'commons-eventbus';
import {EventEmitter} from 'events';
import {System} from '../system/System';
import {IEntityRef} from 'commons-schema-api';
import {IWorkerInfo} from '../worker/IWorkerInfo';
import {DistributedQueryWorker} from '../../workers/DistributedQueryWorker';
import {Log} from '../logging/Log';
import {C_WORKERS} from '../worker/Constants';
import {ISaveOp} from '../storage/framework/ISaveOp';
import {DistributedSaveEvent} from './DistributedSaveEvent';
import {DistributedSaveResultsEvent} from './DistributedSaveResultsEvent';
import {TypeOrmUtils} from '../storage/framework/typeorm/TypeOrmUtils';
import {TypeOrmEntityRegistry} from '../storage/framework/typeorm/schema/TypeOrmEntityRegistry';
import {__DISTRIBUTED_ID__, __REMOTE_IDS__, XS_P_$ERRORED, XS_P_$SAVED} from './Constants';
import {IDistributedSaveOptions} from './IDistributedSaveOptions';


export class DistributedSaveOp<T> extends EventEmitter implements ISaveOp<T> {


  private system: System;

  private options: IDistributedSaveOptions;

  private timeout = 10000;

  private targetIds: string[] = [];

  private objects: any[] = [];

  private saveEvent: DistributedSaveEvent = new DistributedSaveEvent();

  private saveResults: DistributedSaveResultsEvent[] = [];

  private entityRefs: { [k: string]: IEntityRef } = {};

  private results: any[] = [];

  private active = true;

  private isArray: boolean;


  private start: Date;

  private stop: Date;

  constructor(system: System) {
    super();
    this.system = system;
    this.once('postprocess', this.postProcess.bind(this));
  }

  prepare(controller: DistributedStorageEntityController) {
    return this;
  }


  @subscribe(DistributedSaveResultsEvent)
  onResults(event: DistributedSaveResultsEvent) {
    if (!this.active) {
      return;
    }

    // has query event
    if (!this.saveEvent) {
      return;
    }

    // check if response is mine
    if (this.saveEvent.queryId !== event.queryId) {
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

      this.saveResults.push(event);
    }
    if (this.targetIds.length === 0) {
      this.active = false;
      this.emit('postprocess');
    }
  }


  async run(objects: T | T[], options?: IDistributedSaveOptions): Promise<T[]> {
    this.options = _.defaults(options, {timeout: 10000});
    this.timeout = this.options.timeout;

    let inc = 0;
    this.isArray = _.isArray(objects);
    this.objects = _.isArray(objects) ? objects : [objects];
    this.objects.forEach((o: any) => {
      _.set(o, '__distributedId__', inc++);
    });


    this.saveEvent.nodeId = this.system.node.nodeId;
    this.saveEvent.objects = TypeOrmUtils.resolveByEntityDef(this.objects);
    this.saveEvent.options = options;

    // get refs
    _.keys(this.saveEvent.objects).map(entityType => {
      this.entityRefs[entityType] = TypeOrmEntityRegistry.$().getEntityRefFor(entityType);
    });


    // mark objects


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

    this.saveEvent.targetIds = this.targetIds;
    if (this.targetIds.length === 0) {
      return this.results;
    }


    // register as bus
    await EventBus.register(this);
    Log.debug('fire query event with id: ' + this.saveEvent.queryId + ' to targets ' + this.targetIds.join(', '));

    try {
      this.start = new Date();
      const ready = this.ready();
      await EventBus.postAndForget(this.saveEvent);
      await ready;
    } catch (err) {
      Log.error(err);
    }

    await EventBus.unregister(this);
    this.removeAllListeners();
    return this.objects;
  }


  postProcess(err: Error) {
    this.stop = new Date();
    const errors = [];
    let saved = 0;
    let errored = 0;
    for (const event of this.saveResults) {
      if (!_.isEmpty(event.error)) {
        errors.push(new Error('distributed save error: ' + event.nodeId + ' > ' + event.error));
        errored++;
      }
      _.keys(event.results).map(entityType => {
        const entityRef = this.entityRefs[entityType];
        const ids = entityRef.getPropertyRefs().filter(p => p.isIdentifier());
        for (const entry of event.results[entityType]) {
          const did = _.get(entry, __DISTRIBUTED_ID__);
          const id = {};
          ids.forEach(_id => {
            id[_id.name] = _id.get(entry);
          });
          const localObject = this.objects.find(x => _.get(x, __DISTRIBUTED_ID__) === did);
          if (!localObject[__REMOTE_IDS__]) {
            localObject[__REMOTE_IDS__] = {};
          }
          saved++;
          localObject[__REMOTE_IDS__][event.nodeId] = id;
        }
      });
    }

    this.objects[XS_P_$SAVED] = saved;
    this.objects[XS_P_$ERRORED] = errored;

    this.emit('finished', errors, this.objects);
  }


  ready() {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.emit('postprocess', new Error('timeout error [' + this.timeout +
          '] after duration of ' + (Date.now() - this.start.getTime()) + 'ms'));
        clearTimeout(t);
      }, this.timeout);

      this.once('finished', (err: Error | Error[], data: any) => {
        clearTimeout(t);
        Log.debug('finished query event with id: ' + this.saveEvent.queryId +
          ' duration=' + (this.stop.getTime() - this.start.getTime()) + 'ms');


        if (!_.isEmpty(err)) {
          if (_.isArray(err)) {
            Log.error(...err);
          } else {
            Log.error(err);
          }
          if (!_.isEmpty(data)) {
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


