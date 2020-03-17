import * as _ from 'lodash';
import {EventBus, subscribe} from 'commons-eventbus';
import {XS_P_$COUNT, XS_P_$LIMIT, XS_P_$OFFSET} from '../libs/Constants';
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
import {DistributedFindRequest} from '../libs/distributed_storage/find/DistributedFindRequest';
import {DistributedSaveRequest} from '../libs/distributed_storage/save/DistributedSaveRequest';
import {IDistributedQueryWorkerOptions} from '../libs/distributed_storage/IDistributedQueryWorkerOptions';
import {ILoggerApi} from '../libs/logging/ILoggerApi';
import {DistributedFindResponse} from '../libs/distributed_storage/find/DistributedFindResponse';
import {DistributedSaveResponse} from '../libs/distributed_storage/save/DistributedSaveResponse';
import {__CLASS__, __DISTRIBUTED_ID__, __REGISTRY__, DS_OPERATION} from '../libs/distributed_storage/Constants';
import {EntityControllerRegistry} from '../libs/storage/EntityControllerRegistry';
import {AbstractEvent} from '..';
import {DistributedUpdateResponse} from '../libs/distributed_storage/update/DistributedUpdateResponse';
import {DistributedRemoveResponse} from '../libs/distributed_storage/remove/DistributedRemoveResponse';
import {DistributedAggregateResponse} from '../libs/distributed_storage/aggregate/DistributedAggregateResponse';
import {NotSupportedError} from 'commons-base';
import {DistributedAggregateRequest} from '../libs/distributed_storage/aggregate/DistributedAggregateRequest';
import {DistributedUpdateRequest} from '../libs/distributed_storage/update/DistributedUpdateRequest';
import {DistributedRemoveRequest} from '../libs/distributed_storage/remove/DistributedRemoveRequest';


export interface IQueryWorkload extends IQueueWorkload {

  /**
   * Which operation should be done
   */
  operation: DS_OPERATION;

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
  event:
    DistributedFindRequest |
    DistributedSaveRequest |
    DistributedAggregateRequest |
    DistributedUpdateRequest |
    DistributedRemoveRequest;

  response:
    DistributedFindResponse |
    DistributedSaveResponse |
    DistributedUpdateResponse |
    DistributedAggregateResponse |
    DistributedRemoveResponse;

}


export class DistributedQueryWorker implements IQueueProcessor<IQueryWorkload>, IWorker {

  @Inject(System.NAME)
  private system: System;

  @Inject(EntityControllerRegistry.NAME)
  private entityControllerRegistry: EntityControllerRegistry;

  // @Inject(Storage.NAME)
  // private storage: Storage;


  name = 'distributed_query_worker';

  nodeId: string;

  queue: AsyncWorkerQueue<IQueryWorkload>;

  logger: ILoggerApi;

  private options: IDistributedQueryWorkerOptions;

  async prepare(options: IDistributedQueryWorkerOptions = {
    name: 'queryworkerqueue',
    concurrent: 100
  }) {
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

  @subscribe(DistributedFindRequest)
  onFindRequest(event: DistributedFindRequest) {
    const response = this.createResponse('find', event);
    try {
      // check if its for me
      if (event.targetIds && event.targetIds.indexOf(this.system.node.nodeId) === -1) {
        return;
      }

      if (!this.isAllowed(event.nodeId, event.entityType)) {
        response.skipping = true;
        response.results = [];
        EventBus.postAndForget(response);
        return;
      }

      const entityRef = TypeOrmEntityRegistry.$().getEntityRefFor(event.entityType);
      if (!entityRef) {
        // no entity ref
        response.error = new Error('entity ref not found');
        response.results = [];
        EventBus.postAndForget(response);
        return;
      }

      const q: IQueryWorkload = {
        operation: 'find',
        entityRef: entityRef,
        event: event,
        response: response
      };
      this.queue.push(q);
    } catch (err) {
      response.error = err.message;
      response.results = [];
      EventBus.postAndForget(response);
      this.logger.error(err);
    }
  }


  @subscribe(DistributedSaveRequest)
  onSaveEvent(event: DistributedSaveRequest) {
    const response = this.createResponse('save', event);
    try {

      // check if its for me
      if (event.targetIds && event.targetIds.indexOf(this.system.node.nodeId) === -1) {
        return;
      }

      const entityTypes = _.keys(event.objects);
      const failed = entityTypes.map(type => this.isAllowed(event.nodeId, type)).filter(x => !x);
      if (failed.length > 0) {
        // const resultsEvent = this.createSaveResultEvent(event);
        response.skipping = true;
        response.results = {};
        EventBus.postAndForget(response);
        return;
      }


      const entityRefs = {};
      for (const entityType of entityTypes) {
        entityRefs[entityType] = TypeOrmEntityRegistry.$().getEntityRefFor(entityType);
        if (!entityRefs[entityType]) {
          // no entity ref
          // const resultsEvent = this.createResponse("save", event);
          response.error = new Error('entity ref ' + entityType + ' not found');
          response.results = {};
          EventBus.postAndForget(response);
          return;
        }
      }

      const q: IQueryWorkload = {
        operation: 'save',
        entityRefs: entityRefs,
        event: event,
        response: response
      };
      this.queue.push(q);
    } catch (err) {
      // const resultsEvent = this.createSaveResultEvent(event);
      response.error = err.message;
      response.results = {};
      EventBus.postAndForget(response);
      this.logger.error(err);
    }
  }

  createResponse(type: DS_OPERATION, req: AbstractEvent) {
    let res = null;
    switch (type) {
      case 'find':
        res = new DistributedFindResponse();
        break;
      case 'save':
        res = new DistributedSaveResponse();
        break;
      case 'update':
        res = new DistributedUpdateResponse();
        break;
      case 'remove':
        res = new DistributedRemoveResponse();
        break;
      case 'aggregate':
        res = new DistributedAggregateResponse();
        break;
      default:
        throw new NotSupportedError(`type = ${type} not found`);
    }
    res.reqEventId = req.id;
    res.respId = this.system.node.nodeId;
    res.nodeId = this.system.node.nodeId;
    res.targetIds = [req.nodeId];
    return res;
  }


  do(workLoad: IQueryWorkload, queue?: AsyncWorkerQueue<any>): Promise<any> {
    // execute query
    // workLoad.event.
    switch (workLoad.operation) {
      case 'find':
        return this.doFind(
          workLoad.response as DistributedFindResponse,
          workLoad.entityRef,
          workLoad.event as DistributedFindRequest);
        break;
      case 'save':
        return this.doSave(
          workLoad.response as DistributedSaveResponse,
          workLoad.entityRefs,
          workLoad.event as DistributedSaveRequest);
        break;

    }
    throw new Error('no operation detected');
  }

  async doFind(response: DistributedFindResponse, ref: IEntityRef, o: DistributedFindRequest) {
    response.results = [];
    try {
      const classRef = ref.getClassRef();
      const entityController = this.entityControllerRegistry.getControllerForClass(classRef, _.get(o, 'options.controllerHint', null));
      if (!entityController) {
        throw new Error(`EntityController not found for class ${classRef.name}`);
      }
      const opts: IFindOptions = o.options;

      response.results = await entityController.find(
        classRef.getClass(),
        o.conditions,
        opts
      );

      response.results.forEach(x => {
        _.set(x, __CLASS__, classRef.name);
        _.set(x, __REGISTRY__, _.get(classRef, 'lookupRegistry'));
      });

      response.count = response.results[XS_P_$COUNT];
      response.limit = response.results[XS_P_$LIMIT];
      response.offset = response.results[XS_P_$OFFSET];
      this.logger.debug('distributed query worker:  found ' + response.count +
        ' entries for ' + classRef.name + '[qId: ' + response.id + ']');
    } catch (err) {
      response.error = err.message;
      this.logger.error(err);
    }

    // fire query results
    return EventBus.postAndForget(response);
  }

  async doSave(response: DistributedSaveResponse, refs: { [type: string]: IEntityRef }, o: DistributedSaveRequest) {
    response.results = {};
    try {
      for (const entityType of _.keys(refs)) {
        if (_.isEmpty(o.objects[entityType])) {
          continue;
        }
        const ref = refs[entityType];
        const classRef = ref.getClassRef();
        const entityController = this.entityControllerRegistry.getControllerForClass(classRef, _.get(o, 'options.controllerHint', null));
        if (!entityController) {
          throw new Error(`EntityController not found for class ${classRef.name}`);
        }
        const build = o.objects[entityType].map(x => classRef.build(x, {
          afterBuild: (entityRef, from, to) => {
            // keep the remote id
            _.set(to, __DISTRIBUTED_ID__, _.get(from, __DISTRIBUTED_ID__));
            _.set(to, __CLASS__, classRef.name);
            _.set(to, __REGISTRY__, _.get(classRef, 'lookupRegistry'));
          }
        }));
        response.results[entityType] = await entityController.save(build, o.options);
        this.logger.debug('distributed query worker:  save ' + classRef.name + ' amount of ' + response.results[entityType].length +
          '[qId: ' + response.reqEventId + ']');
      }
    } catch (err) {
      response.error = err.message;
      this.logger.error(err);
    }

    return EventBus.postAndForget(response);
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
