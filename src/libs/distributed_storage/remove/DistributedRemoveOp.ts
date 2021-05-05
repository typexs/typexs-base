import {DistributedStorageEntityController} from './../DistributedStorageEntityController';
import {System} from '../../system/System';
import {ClassType} from '@allgemein/schema-api';
import {AbstractMessage} from '../../messaging/AbstractMessage';
import {EntityControllerRegistry} from '../../storage/EntityControllerRegistry';
import {DistributedRemoveRequest} from './DistributedRemoveRequest';
import {DistributedRemoveResponse} from './DistributedRemoveResponse';
import {IDistributedRemoveOptions} from './IDistributedRemoveOptions';
import {IDeleteOp} from '../../storage/framework/IDeleteOp';
import * as _ from 'lodash';
import {IWorkerInfo} from '../../worker/IWorkerInfo';
import {DistributedQueryWorker} from '../../../workers/DistributedQueryWorker';
import {__DISTRIBUTED_ID__} from '../Constants';
import {ClassUtils} from '@allgemein/base';
import {C_WORKERS} from '../../worker/Constants';
import {BaseUtils} from '../../utils/BaseUtils';


export class DistributedRemoveOp<T>
  extends AbstractMessage<DistributedRemoveRequest, DistributedRemoveResponse>
  implements IDeleteOp<T> {

  protected removable: T | T[] | ClassType<T>;


  protected conditions: any;

  protected isArray: boolean;

  // protected entityTypeOrig: Function | ClassType<T> | string;

  protected entityType: Function | ClassType<T> | string;

  protected entityControllerRegistry: EntityControllerRegistry;

  constructor(system: System, entityControllerRegistry: EntityControllerRegistry) {
    super(system, DistributedRemoveRequest, DistributedRemoveResponse);
    this.entityControllerRegistry = entityControllerRegistry;
    this.timeout = 10000;
  }

  getConditions(): any {
    return this.conditions;
  }

  getRemovable() {
    return this.removable;
  }

  getOptions(): IDistributedRemoveOptions {
    return this.options;
  }

  prepare(controller: DistributedStorageEntityController) {
    return this;
  }


  async run(object: T[] | ClassType<T> | T, conditions?: any, options?: IDistributedRemoveOptions): Promise<T[] | number | T> {
    this.options = options || {};
    this.removable = object;

    if (_.isFunction(object)) {
      // delete by conditions
      this.entityType = object;
      this.conditions = conditions;
    } else {
      // delete by id
      this.isArray = _.isArray(object);

      let inc = 0;
      const objects = _.isArray(object) ? object : [<T>object];
      objects.forEach((o: any) => {
        _.set(o, __DISTRIBUTED_ID__, inc++);
      });
      this.options = conditions || {};
    }

    _.defaults(this.options, {
      timeout: 10000
    });
    this.timeout = this.options.timeout;


    const req = new DistributedRemoveRequest();
    req.condition = this.conditions;
    req.options = this.options;
    if (_.isUndefined(this.entityType)) {
      req.removable = BaseUtils.resolveByClassName(
        this.isArray ? <T[]>this.removable : [this.removable]
      );
    } else {
      req.entityType = ClassUtils.getClassName(this.entityType);
    }

    // also fire self
    this.targetIds = this.system.getNodesWith(C_WORKERS)
      .filter(n => n.contexts
        .find(c => c.context === C_WORKERS).workers
        .find((w: IWorkerInfo) => w.className === DistributedQueryWorker.name))
      .map(n => n.nodeId);

    if (this.options.targetIds) {
      this.targetIds = _.intersection(this.targetIds, this.options.targetIds);
    }

    if (this.options.skipLocal) {
      _.remove(this.targetIds, x => x === this.getSystem().getNodeId());
    }

    if (this.targetIds.length === 0) {
      throw new Error('no distributed worker found to execute the query.');
    }

    // this.queryEvent.targetIds = this.targetIds;
    if (this.targetIds.length === 0) {
      return 0;
    }

    await this.send(req);

    return this.results;
  }


  doPostProcess(responses: DistributedRemoveResponse[], err?: Error): any {
    const errors: string[] = [];
    const affected = {};
    for (const res of responses) {
      affected[res.nodeId] = res.affected;
      if (res.error) {
        errors.push(res.nodeId + ': ' + res.error.message);
      }
    }
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }

    return affected;
  }

}


