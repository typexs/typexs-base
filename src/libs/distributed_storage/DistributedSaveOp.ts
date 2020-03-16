import * as _ from 'lodash';
import {DistributedStorageEntityController} from './DistributedStorageEntityController';
import {System} from '../system/System';
import {IEntityRef} from 'commons-schema-api';
import {ISaveOp} from '../storage/framework/ISaveOp';
import {DistributedSaveEvent} from './DistributedSaveEvent';
import {DistributedSaveResultsEvent} from './DistributedSaveResultsEvent';
import {TypeOrmUtils} from '../storage/framework/typeorm/TypeOrmUtils';
import {TypeOrmEntityRegistry} from '../storage/framework/typeorm/schema/TypeOrmEntityRegistry';
import {__DISTRIBUTED_ID__, __REMOTE_IDS__, XS_P_$ERRORED, XS_P_$SAVED} from './Constants';
import {IDistributedSaveOptions} from './IDistributedSaveOptions';
import {AbstractMessage} from '../messaging/AbstractMessage';
import {IMessageOptions} from '../messaging/IMessageOptions';
import {C_WORKERS} from '../worker/Constants';
import {DistributedQueryWorker} from '../../workers/DistributedQueryWorker';
import {IWorkerInfo} from '../worker/IWorkerInfo';


export class DistributedSaveOp<T>
  extends AbstractMessage<DistributedSaveEvent,
    DistributedSaveResultsEvent> implements ISaveOp<T> {


  // private distributedOptions: IDistributedSaveOptions;

  // private targetIds: string[] = [];

  private objects: any[] = [];

  // private saveEvent: DistributedSaveEvent = new DistributedSaveEvent();
  //
  // private saveResults: DistributedSaveResultsEvent[] = [];

  private entityRefs: { [k: string]: IEntityRef } = {};

  // private results: any[] = [];

  // private active = true;

  private isArray: boolean;


  constructor(system: System) {
    super(system, DistributedSaveEvent, DistributedSaveResultsEvent);
    this.timeout = 10000;
  }

  getOptions(): IDistributedSaveOptions & IMessageOptions {
    return this.options;
  }

  getObjects(): T[] {
    return this.objects;
  }

  getIsArray(): boolean {
    return this.isArray;
  }

  prepare(controller: DistributedStorageEntityController) {
    return this;
  }


  // @subscribe(DistributedSaveResultsEvent)
  // onResults(event: DistributedSaveResultsEvent) {
  //   if (!this.active) {
  //     return;
  //   }
  //
  //   // has query event
  //   if (!this.saveEvent) {
  //     return;
  //   }
  //
  //   // check if response is mine
  //   if (this.saveEvent.queryId !== event.queryId) {
  //     return;
  //   }
  //
  //   // results for me?
  //   if (event.targetIds.indexOf(this.system.node.nodeId) === -1) {
  //     return;
  //   }
  //
  //   // waiting for the results?
  //   if (this.targetIds.indexOf(event.nodeId) === -1) {
  //     return;
  //   }
  //   _.remove(this.targetIds, x => x === event.nodeId);
  //
  //
  //   if (!event.skipping) {
  //     this.saveResults.push(event);
  //   }
  //
  //   if (this.targetIds.length === 0) {
  //     this.active = false;
  //     this.emit('postprocess');
  //   }
  // }


  async run(objects: T | T[], options?: IDistributedSaveOptions & IMessageOptions): Promise<T[]> {
    this.options = _.defaults(options, {timeout: 10000});
    this.timeout = this.options.timeout;

    let inc = 0;
    this.isArray = _.isArray(objects);
    this.objects = _.isArray(objects) ? objects : [objects];
    this.objects.forEach((o: any) => {
      _.set(o, __DISTRIBUTED_ID__, inc++);
    });

    const req = new DistributedSaveEvent();
    req.objects = TypeOrmUtils.resolveByEntityDef(this.objects);
    req.options = this.options;


    // this.request.nodeId = this.system.node.nodeId;
    // this.request.objects = TypeOrmUtils.resolveByEntityDef(this.objects);
    // this.request.options = options;
    //
    // // get refs
    _.keys(req.objects).map(entityType => {
      this.entityRefs[entityType] = TypeOrmEntityRegistry.$().getEntityRefFor(entityType);
    });


    // mark objects


    // also fire self
    this.targetIds = this.system.getNodesWith(C_WORKERS)
      .filter(n => n.contexts
        .find(c => c.context === C_WORKERS).workers
        .find((w: IWorkerInfo) => w.className === DistributedQueryWorker.name))
      .map(n => n.nodeId);

    if (this.options.nodeIds) {
      this.targetIds = _.intersection(this.targetIds, this.options.nodeIds);
    }

    if (this.targetIds.length === 0) {
      throw new Error('no distributed worker found to execute the query.');
    }

    // this.request.targetIds = this.targetIds;
    if (this.targetIds.length === 0) {
      return this.results;
    }

    await this.send(req);

    // // register as bus
    // await EventBus.register(this);
    // Log.debug('fire query event with id: ' + this.request.queryId + ' to targets ' + this.targetIds.join(', '));
    //
    // try {
    //   this.start = new Date();
    //   await Promise.all([this.ready(), EventBus.postAndForget(this.request)]);
    // } catch (err) {
    //   Log.error(err);
    // }
    //
    // await EventBus.unregister(this);
    // this.removeAllListeners();
    // return this.objects;
    return this.objects;
  }


  doPostProcess(responses: DistributedSaveResultsEvent[], err: Error) {
    this.stop = new Date();
    const errors = [];
    let saved = 0;
    let errored = 0;
    for (const event of responses) {
      if (!_.isEmpty(event.error)) {
        errors.push(new Error('distributed save error: ' + event.nodeId + ' > ' + event.error));
        errored++;
      }
      _.keys(event.results).map(entityType => {
        const entityRef = this.entityRefs[entityType];
        const ids = entityRef.getPropertyRefs().filter(p => p.isIdentifier());
        for (const entry of event.results[entityType]) {
          const distributedId = _.get(entry, __DISTRIBUTED_ID__);
          const id = {};
          ids.forEach(_id => {
            id[_id.name] = _id.get(entry);
          });
          const localObject = this.objects.find(x => _.get(x, __DISTRIBUTED_ID__) === distributedId);
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

    return this.objects;
  }


}


