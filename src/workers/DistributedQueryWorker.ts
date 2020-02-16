import * as _ from 'lodash';
import {EventBus, subscribe} from 'commons-eventbus';
import {XS_P_$COUNT, XS_P_$LIMIT, XS_P_$OFFSET} from '../libs/Constants';
import {Storage} from '../libs/storage/Storage';
import {Bootstrap} from './../Bootstrap';
import {TypeOrmEntityRegistry} from './../libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry';
import {Inject} from 'typedi';
import {System} from '../libs/system/System';
import {IEntityRef} from 'commons-schema-api';
import {IWorker} from '../libs/worker/IWorker';
import {IWorkerStatisitic} from '../libs/worker/IWorkerStatisitic';
import {IQueueWorkload} from '../libs/queue/IQueueWorkload';
import {IQueueProcessor} from '../libs/queue/IQueueProcessor';
import {AsyncWorkerQueue} from '../libs/queue/AsyncWorkerQueue';
import {Log} from '../libs/logging/Log';
import {IFindOptions} from '../libs/storage/framework/IFindOptions';
import {DistributedQueryEvent} from '../libs/distributed/DistributedQueryEvent';
import {DistributedSaveEvent} from '../libs/distributed/DistributedSaveEvent';
import {IDistributedQueryWorkerOptions} from '../libs/distributed/IDistributedQueryWorkerOptions';
import {ILoggerApi} from '../libs/logging/ILoggerApi';
import {DistributedQueryResultsEvent} from '../libs/distributed/DistributedQueryResultsEvent';
import {DistributedSaveResultsEvent} from '../libs/distributed/DistributedSaveResultsEvent';
import {__DISTRIBUTED_ID__} from '../libs/distributed/Constants';


export interface IQueryWorkload extends IQueueWorkload {

  /**
   * Which operation should be done
   */
  operation: 'find' | 'save';

  /**
   * Single resolve reference to entity type
   */
  entityRef?: IEntityRef;

  /**
   * Multipe references to entity type
   */
  entityRefs?: { [k: string]: IEntityRef };

  /**
   * Received event
   */
  event: DistributedQueryEvent | DistributedSaveEvent;

}


export class DistributedQueryWorker implements IQueueProcessor<IQueryWorkload>, IWorker {

  @Inject(System.NAME)
  private system: System;


  @Inject(Storage.NAME)
  private storage: Storage;


  name = 'distributed_query_worker';

  nodeId: string;

  queue: AsyncWorkerQueue<IQueryWorkload>;

  logger: ILoggerApi;

  private options: IDistributedQueryWorkerOptions;

  async prepare(options: IDistributedQueryWorkerOptions = {name: 'queryworkerqueue'}) {
    this.options = _.defaults(options, {onlyRemote: false, allowed: {}});
    this.logger = _.get(this.options, 'logger', Log.getLoggerFor(DistributedQueryWorker));
    this.nodeId = Bootstrap.getNodeId();
    this.queue = new AsyncWorkerQueue<IQueryWorkload>(this, {...options, logger: this.logger});
    await EventBus.register(this);
    this.logger.debug('waiting for requests ...');
  }

  isAllowed(sourceId: string, type: string = null) {
    if (this.options.onlyRemote && sourceId === this.nodeId) {
      return false;
    }

    if (_.isEmpty(this.options.allowed)) {
      return true;
    }

    if (this.options.allowed.hasOwnProperty(sourceId)) {
      if (type === '*' || type === null) {
        return true;
      } else {
        const _type = _.snakeCase(type);
        if (_.isString(this.options.allowed[sourceId])) {
          return _.snakeCase(this.options.allowed[sourceId] as string) === _type;
        } else if (_.isArray(this.options.allowed[sourceId])) {
          return !!_.find(this.options.allowed[sourceId], x => _.snakeCase(x) === _type);
        }

      }
    }
    return false;
  }

  @subscribe(DistributedQueryEvent)
  onQueryEvent(event: DistributedQueryEvent) {
    try {
      // check if its for me
      if (event.targetIds && event.targetIds.indexOf(this.system.node.nodeId) === -1) {
        return;
      }

      if (!this.isAllowed(event.nodeId, event.entityType)) {
        const resultsEvent = this.createQueryResultEvent(event);
        resultsEvent.forbidden = true;
        resultsEvent.results = [];
        EventBus.postAndForget(resultsEvent);
        return;
      }

      const entityRef = TypeOrmEntityRegistry.$().getEntityRefFor(event.entityType);
      if (!entityRef) {
        // no entity ref
        const resultsEvent = this.createQueryResultEvent(event);
        resultsEvent.error = new Error('entity ref not found');
        resultsEvent.results = [];
        EventBus.postAndForget(resultsEvent);
        return;
      }

      const q: IQueryWorkload = {
        operation: 'find',
        entityRef: entityRef,
        event: event
      };
      this.queue.push(q);
    } catch (err) {
      const resultsEvent = this.createQueryResultEvent(event);
      resultsEvent.error = err.message;
      resultsEvent.results = [];
      EventBus.postAndForget(resultsEvent);
      this.logger.error(err);
    }
  }


  @subscribe(DistributedSaveEvent)
  onSaveEvent(event: DistributedSaveEvent) {
    try {

      // check if its for me
      if (event.targetIds && event.targetIds.indexOf(this.system.node.nodeId) === -1) {
        return;
      }

      const entityTypes = _.keys(event.objects);
      const failed = entityTypes.map(type => this.isAllowed(event.nodeId, type)).filter(x => !x);
      if (failed.length > 0) {
        const resultsEvent = this.createSaveResultEvent(event);
        resultsEvent.forbidden = true;
        resultsEvent.results = {};
        EventBus.postAndForget(resultsEvent);
        return;
      }


      const entityRefs = {};
      for (const entityType of entityTypes) {
        entityRefs[entityType] = TypeOrmEntityRegistry.$().getEntityRefFor(entityType);
        if (!entityRefs[entityType]) {
          // no entity ref
          const resultsEvent = this.createSaveResultEvent(event);
          resultsEvent.error = new Error('entity ref ' + entityType + ' not found');
          resultsEvent.results = {};
          EventBus.postAndForget(resultsEvent);
          return;
        }
      }

      const q: IQueryWorkload = {
        operation: 'save',
        entityRefs: entityRefs,
        event: event
      };
      this.queue.push(q);
    } catch (err) {
      const resultsEvent = this.createSaveResultEvent(event);
      resultsEvent.error = err.message;
      resultsEvent.results = {};
      EventBus.postAndForget(resultsEvent);
      this.logger.error(err);
    }
  }


  createQueryResultEvent(event: DistributedQueryEvent) {
    const resultsEvent = new DistributedQueryResultsEvent();
    resultsEvent.queryId = event.queryId;
    resultsEvent.respId = this.system.node.nodeId;
    resultsEvent.nodeId = this.system.node.nodeId;
    resultsEvent.targetIds = [event.nodeId];
    return resultsEvent;
  }


  createSaveResultEvent(event: DistributedSaveEvent) {
    const resultsEvent = new DistributedSaveResultsEvent();
    resultsEvent.queryId = event.queryId;
    resultsEvent.respId = this.system.node.nodeId;
    resultsEvent.nodeId = this.system.node.nodeId;
    resultsEvent.targetIds = [event.nodeId];
    return resultsEvent;
  }


  do(workLoad: IQueryWorkload, queue?: AsyncWorkerQueue<any>): Promise<any> {
    // execute query
    // workLoad.event.
    if (workLoad.operation === 'find') {
      return this.doFind(workLoad.entityRef, <DistributedQueryEvent>workLoad.event);
    } else if (workLoad.operation === 'save') {
      return this.doSave(workLoad.entityRefs, <DistributedSaveEvent>workLoad.event);
    }
    throw new Error('no operation detected');
  }


  async doSave(refs: { [type: string]: IEntityRef }, o: DistributedSaveEvent) {
    const resultsEvent = this.createSaveResultEvent(o);
    resultsEvent.results = {};
    try {
      for (const entityType of _.keys(refs)) {
        if (_.isEmpty(o.objects[entityType])) {
          continue;
        }
        const ref = refs[entityType];
        const classRef = ref.getClassRef();
        const storageRef = this.storage.forClass(classRef);
        const build = o.objects[entityType].map(x => classRef.build(x, {
          afterBuild: (entityRef, from, to) => {
            // keep the remote id
            _.set(to, __DISTRIBUTED_ID__, _.get(from, __DISTRIBUTED_ID__));
          }
        }));
        resultsEvent.results[entityType] = await storageRef.getController().save(build, o.options);
        this.logger.debug('distributed query worker:  save ' + classRef.name + ' amount of ' + resultsEvent.results[entityType].length +
          '[qId: ' + resultsEvent.queryId + ']');
      }
    } catch (err) {
      resultsEvent.error = err.message;
      this.logger.error(err);
    }

    return EventBus.postAndForget(resultsEvent);
  }


  async doFind(ref: IEntityRef, o: DistributedQueryEvent) {

    const resultsEvent = this.createQueryResultEvent(o);
    resultsEvent.results = [];

    try {
      const classRef = ref.getClassRef();
      const storageRef = this.storage.forClass(classRef);
      const opts: IFindOptions = o.options;

      resultsEvent.results = await storageRef.getController().find(
        classRef.getClass(),
        o.conditions,
        opts
      );

      resultsEvent.count = resultsEvent.results[XS_P_$COUNT];
      resultsEvent.limit = resultsEvent.results[XS_P_$LIMIT];
      resultsEvent.offset = resultsEvent.results[XS_P_$OFFSET];
      this.logger.debug('distributed query worker:  found ' + resultsEvent.count +
        ' entries for ' + classRef.name + '[qId: ' + resultsEvent.queryId + ']');
    } catch (err) {
      resultsEvent.error = err.message;
      this.logger.error(err);
    }


    // fire query results
    return EventBus.postAndForget(resultsEvent);
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
