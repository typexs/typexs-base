import * as _ from 'lodash';
import {EventBus, subscribe} from 'commons-eventbus';
import {__CLASS__, __NODE_ID__, __REGISTRY__, XS_P_$COUNT, XS_P_$LIMIT, XS_P_$OFFSET} from '../libs/Constants';
import {Bootstrap} from './../Bootstrap';
import {Inject} from 'typedi';
import {System} from '../libs/system/System';
import {IEntityRef} from '@allgemein/schema-api';
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
import {
  __DISTRIBUTED_ID__,
  DS_OPERATION
} from '../libs/distributed_storage/Constants';
import {EntityControllerRegistry} from '../libs/storage/EntityControllerRegistry';
import {DistributedUpdateResponse} from '../libs/distributed_storage/update/DistributedUpdateResponse';
import {DistributedRemoveResponse} from '../libs/distributed_storage/remove/DistributedRemoveResponse';
import {DistributedAggregateResponse} from '../libs/distributed_storage/aggregate/DistributedAggregateResponse';
import {NotSupportedError} from '@allgemein/base';
import {DistributedAggregateRequest} from '../libs/distributed_storage/aggregate/DistributedAggregateRequest';
import {DistributedUpdateRequest} from '../libs/distributed_storage/update/DistributedUpdateRequest';
import {DistributedRemoveRequest} from '../libs/distributed_storage/remove/DistributedRemoveRequest';
import {IUpdateOptions} from '../libs/storage/framework/IUpdateOptions';
import {AbstractEvent} from '../libs/messaging/AbstractEvent';


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


  @subscribe(DistributedAggregateRequest)
  @subscribe(DistributedFindRequest)
  @subscribe(DistributedSaveRequest)
  @subscribe(DistributedRemoveRequest)
  @subscribe(DistributedUpdateRequest)
  onRequest(event:
              DistributedFindRequest |
              DistributedSaveRequest |
              DistributedAggregateRequest |
              DistributedUpdateRequest |
              DistributedRemoveRequest) {
    let type: DS_OPERATION = null;
    if (event instanceof DistributedFindRequest) {
      type = 'find';
    } else if (event instanceof DistributedSaveRequest) {
      type = 'save';
    } else if (event instanceof DistributedAggregateRequest) {
      type = 'aggregate';
    } else if (event instanceof DistributedUpdateRequest) {
      type = 'update';
    } else if (event instanceof DistributedRemoveRequest) {
      type = 'remove';
    } else {
      throw new NotSupportedError('');
    }
    const response = this.createResponse(type, event);
    try {
      // check if its for me
      if (event.targetIds && event.targetIds.indexOf(this.system.node.nodeId) === -1) {
        return;
      }

      const q: IQueryWorkload = {
        operation: type,
        event: event,
        response: response
      };

      switch (type) {
        case 'find':
          this.onFindRequest(event as DistributedFindRequest, response as DistributedFindResponse);
          break;
        case 'save':
          this.onSaveRequest(event as DistributedSaveRequest, response as DistributedSaveResponse);
          break;
        case 'aggregate':
          this.onAggregateRequest(event as DistributedAggregateRequest, response as DistributedAggregateResponse);
          break;
        case 'remove':
          this.onRemoveRequest(event as DistributedRemoveRequest, response as DistributedRemoveResponse);
          break;
        case 'update':
          this.onUpdateRequest(event as DistributedUpdateRequest, response as DistributedUpdateResponse);
          break;
      }

      if (response.error || response.skipping) {
        this.handleError(response);
        EventBus.postAndForget(response);
        return;
      }

      this.queue.push(q);
    } catch (err) {
      response.error = err;
      this.handleError(response);
      EventBus.postAndForget(response);
      this.logger.error(err);
    }
  }

  handleError(response: any) {
    if (response.error instanceof Error) {
      response.error = {
        name: response.error.name,
        message: response.error.message
      };
    }
  }

  async do(workLoad: IQueryWorkload, queue?: AsyncWorkerQueue<any>): Promise<any> {
    // execute query
    // workLoad.event.
    switch (workLoad.operation) {
      case 'find':
        await this.doFind(
          workLoad.response as DistributedFindResponse,
          workLoad.event as DistributedFindRequest);
        break;
      case 'save':
        await this.doSave(
          workLoad.response as DistributedSaveResponse,
          workLoad.event as DistributedSaveRequest);
        break;
      case 'aggregate':
        await this.doAggregate(
          workLoad.response as DistributedAggregateResponse,
          workLoad.event as DistributedAggregateRequest);
        break;
      case 'update':
        await this.doUpdate(
          workLoad.response as DistributedUpdateResponse,
          workLoad.event as DistributedUpdateRequest);
        break;
      case 'remove':
        await this.doRemove(
          workLoad.response as DistributedRemoveResponse,
          workLoad.event as DistributedRemoveRequest);
        break;
      default:
        throw new Error('no operation detected');
    }

    // clear references
    this.handleError(workLoad.response);
    _.set(workLoad.event, 'entityRef', null);
    _.set(workLoad.event, 'entityRefs', null);
    _.set(workLoad.event, 'entityController', null);
    _.set(workLoad.event, 'entityControllers', null);
    return EventBus.postAndForget(workLoad.response);
  }


  onFindRequest(event: DistributedFindRequest, response: DistributedFindResponse) {
    if (!this.isAllowed(event.nodeId, event.entityType)) {
      response.skipping = true;
      response.results = [];
      return;
    }

    const controller = this.entityControllerRegistry.getControllerForClass(event.entityType, _.get(event.options, 'controllerHint', null));
    if (!controller) {
      response.error = new Error('no entity controller defined to handle type "' + event.entityType + '"');
      response.results = [];
      return;
    }

    const entityRef = controller.forClass(event.entityType);
    if (!entityRef) {
      // no entity ref
      response.error = new Error('entity ref not found');
      response.results = [];
      return;
    }

    event.entityController = controller;
    event.entityRef = entityRef;
  }


  onSaveRequest(event: DistributedSaveRequest, response: DistributedSaveResponse) {
    const entityTypes = _.keys(event.objects);
    const failed = entityTypes.map(type => this.isAllowed(event.nodeId, type)).filter(x => !x);
    if (failed.length > 0) {
      response.skipping = true;
      response.results = {};
      return;
    }

    const entityRefs = {};
    const entityControllers = {};
    for (const entityType of entityTypes) {
      entityControllers[entityType] = this.entityControllerRegistry
        .getControllerForClass(entityType, _.get(event.options, 'controllerHint', null));

      if (!entityControllers[entityType]) {
        response.error = new Error('no entity controller defined to handle type "' + entityType + '"');
        response.results = {};
        return;
      }

      entityRefs[entityType] = entityControllers[entityType].forClass(entityType);
      if (!entityRefs[entityType]) {
        // no entity ref
        response.error = new Error('entity ref ' + entityType + ' not found');
        response.results = {};
        return;
      }
    }

    event.entityRefs = entityRefs;
    event.entityControllers = entityControllers;
  }


  onAggregateRequest(event: DistributedAggregateRequest, response: DistributedAggregateResponse) {
    if (_.isEmpty(event.pipeline)) {
      // no entity ref
      response.error = new Error('pipeline is empty');
      response.results = [];
      return;
    }

    if (!this.isAllowed(event.nodeId, event.entityType)) {
      response.skipping = true;
      response.results = [];
      return;
    }

    const controller = this.entityControllerRegistry.getControllerForClass(event.entityType, _.get(event.options, 'controllerHint', null));
    if (!controller) {
      response.error = new Error('no entity controller defined to handle type "' + event.entityType + '"');
      response.results = [];
      return;
    }
    const entityRef = controller.forClass(event.entityType);
    if (!entityRef) {
      // no entity ref
      response.error = new Error('entity ref not found');
      response.results = [];
      return;
    }

    event.entityRef = entityRef;
    event.entityController = controller;
  }


  onRemoveRequest(event: DistributedRemoveRequest, response: DistributedRemoveResponse) {

    if (event.entityType) {

      if (!this.isAllowed(event.nodeId, event.entityType)) {
        response.skipping = true;
        response.affected = -1;
        return;
      }

      const controller = this.entityControllerRegistry
        .getControllerForClass(event.entityType,
          _.get(event.options, 'controllerHint', null));
      if (!controller) {
        response.error = new Error('no entity controller defined to handle type "' + event.entityType + '"');
        response.results = [];
        return;
      }
      const entityRef = controller.forClass(event.entityType);
      if (!entityRef) {
        // no entity ref
        response.error = new Error('entity ref not found');
        response.affected = -1;
        return;
      }

      event.entityRefs = {};
      event.entityControllers = {};

      event.entityRefs[event.entityType] = entityRef;
      event.entityControllers[event.entityType] = controller;

    } else if (event.removable) {
      const entityTypes = _.keys(event.removable);
      const failed = entityTypes.map(type => this
        .isAllowed(event.nodeId, type)).filter(x => !x);
      if (failed.length > 0) {
        response.skipping = true;
        response.affected = -1;
        return;
      }

      const entityRefs = {};
      const entityControllers = {};
      for (const entityType of entityTypes) {
        entityControllers[entityType] = this.entityControllerRegistry
          .getControllerForClass(entityType,
            _.get(event.options, 'controllerHint', null));

        if (!entityControllers[entityType]) {
          response.error = new Error('no entity controller defined to handle type "' + entityType + '"');
          response.results = {};
          return;
        }

        entityRefs[entityType] = entityControllers[entityType].forClass(entityType);
        if (!entityRefs[entityType]) {
          // no entity ref
          response.error = new Error('entity ref ' + entityType + ' not found');
          response.affected = -1;
          return;
        }
      }
      event.entityRefs = entityRefs;
      event.entityControllers = entityControllers;
    }
  }


  async doRemove(response: DistributedRemoveResponse, o: DistributedRemoveRequest) {
    response.affected = -1;
    response.results = {};
    try {
      response.results = {};
      if (o.entityType) {
        const ref = o.entityRefs[o.entityType];
        const classRef = ref.getClassRef();
        const entityController = o.entityControllers[o.entityType];

        response.results[o.entityType] = await entityController
          .remove(classRef.getClass(), o.condition, o.options);
      } else {
        for (const entityType of _.keys(o.entityRefs)) {
          if (_.isEmpty(o.removable[entityType])) {
            continue;
          }

          const ref = o.entityRefs[entityType];
          const classRef = ref.getClassRef();
          const entityController = o.entityControllers[entityType];
          const build = o.removable[entityType].map(x => classRef.build(x, {
            afterBuild: (entityRef, from, to) => {
              // keep the remote id
              _.set(to, __DISTRIBUTED_ID__, _.get(from, __DISTRIBUTED_ID__));
              _.set(to, __CLASS__, classRef.name);
              _.set(to, __REGISTRY__, classRef.getNamespace());
            }
          }));
          response.results[entityType] = await entityController.remove(build, o.options);
          this.logger.debug('distributed query worker:  remove ' + classRef.name + ' amount of ' + response.results[entityType].length +
            '[qId: ' + response.reqEventId + ']');
        }
      }
      response.affected = _.sum(_.keys(response.results).map(x => response.results[x]));
    } catch (err) {
      response.error = err;
      this.logger.error(err);
    }
  }


  onUpdateRequest(event: DistributedUpdateRequest, response: DistributedUpdateResponse) {
    if (!this.isAllowed(event.nodeId, event.entityType)) {
      response.skipping = true;
      response.affected = -1;
      return;
    }

    const controller = this.entityControllerRegistry
      .getControllerForClass(event.entityType,
        _.get(event.options, 'controllerHint', null));
    if (!controller) {
      response.error = new Error('no entity controller defined to handle type "' + event.entityType + '"');
      response.affected = -1;
      return;
    }
    const entityRef = controller.forClass(event.entityType);
    if (!entityRef) {
      // no entity ref
      response.error = new Error('entity ref not found');
      response.affected = -1;
      return;
    }

    if (_.isEmpty(event.conditions) || _.isEmpty(event.update)) {
      // no entity ref
      response.error = new Error('no conditions or update order is missing');
      response.affected = -1;
      return;
    }

    event.entityRef = entityRef;
    event.entityController = controller;
  }


  async doUpdate(response: DistributedUpdateResponse, o: DistributedUpdateRequest) {
    response.affected = 0;

    try {
      const classRef = o.entityRef.getClassRef();
      const entityController = o.entityController;
      const opts: IUpdateOptions = o.options;

      response.affected = await entityController.update(
        classRef.getClass(),
        o.conditions,
        o.update,
        opts
      );

      this.logger.debug('distributed query worker:  affected ' + response.affected +
        ' entries for ' + classRef.name + '[qId: ' + response.id + ']');

    } catch (err) {
      response.error = err;
      this.logger.error(err);
    }
  }


  async doFind(response: DistributedFindResponse, o: DistributedFindRequest) {
    response.results = [];
    try {
      const classRef = o.entityRef.getClassRef();
      const entityController = o.entityController;
      const opts: IFindOptions = o.options;

      response.results = await entityController.find(
        classRef.getClass(),
        o.conditions,
        opts
      );

      response.results.forEach(x => {
        _.set(x, __CLASS__, classRef.name);
        _.set(x, __REGISTRY__, classRef.getNamespace());
        _.set(x, __NODE_ID__, this.nodeId);
      });

      response.count = response.results[XS_P_$COUNT];
      response.limit = response.results[XS_P_$LIMIT];
      response.offset = response.results[XS_P_$OFFSET];
      this.logger.debug('distributed query worker:  found ' + response.count +
        ' entries for ' + classRef.name + '[qId: ' + response.id + ']');
    } catch (err) {
      response.error = err;
      this.logger.error(err);
    }
  }

  async doSave(response: DistributedSaveResponse, o: DistributedSaveRequest) {
    response.results = {};
    try {
      for (const entityType of _.keys(o.entityRefs)) {
        if (_.isEmpty(o.objects[entityType])) {
          continue;
        }
        const ref = o.entityRefs[entityType];
        const classRef = ref.getClassRef();
        const entityController = o.entityControllers[entityType];
        const build = o.objects[entityType].map(x => classRef.build(x, {
          afterBuild: (entityRef, from, to) => {
            // keep the remote id
            _.set(to, __DISTRIBUTED_ID__, _.get(from, __DISTRIBUTED_ID__));
            _.set(to, __CLASS__, classRef.name);
            _.set(to, __REGISTRY__, classRef.getNamespace());
          }
        }));
        response.results[entityType] = await entityController.save(build, o.options);
        this.logger.debug('distributed query worker:  save ' + classRef.name + ' amount of ' + response.results[entityType].length +
          '[qId: ' + response.reqEventId + ']');
      }
    } catch (err) {
      response.error = err;
      this.logger.error(err);
    }


  }

  async doAggregate(response: DistributedAggregateResponse, o: DistributedAggregateRequest) {
    response.results = [];
    try {
      const ref = o.entityRef;
      const classRef = ref.getClassRef();
      const entityController = o.entityController;

      response.results = await entityController.aggregate(classRef.getClass(), o.pipeline, o.options);

      response.results.forEach(x => {
        _.set(x, __CLASS__, classRef.name);
        _.set(x, __REGISTRY__, classRef.getNamespace());
        _.set(x, __NODE_ID__, this.nodeId);
      });

      response.count = response.results[XS_P_$COUNT];
      response.limit = response.results[XS_P_$LIMIT];
      response.offset = response.results[XS_P_$OFFSET];

      this.logger.debug('distributed query worker: aggregate  ' + classRef.name + ' amount of ' + response.results.length +
        '[qId: ' + response.reqEventId + ']');

    } catch (err) {
      response.error = err;
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
