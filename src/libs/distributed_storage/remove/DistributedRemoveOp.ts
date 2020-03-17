import {DistributedStorageEntityController} from './../DistributedStorageEntityController';
import {System} from '../../system/System';
import {ClassType} from 'commons-schema-api';
import {AbstractMessage} from '../../messaging/AbstractMessage';
import {EntityControllerRegistry} from '../../storage/EntityControllerRegistry';
import {DistributedRemoveRequest} from './DistributedRemoveRequest';
import {DistributedRemoveResponse} from './DistributedRemoveResponse';
import {IDistributedRemoveOptions} from './IDistributedRemoveOptions';
import {IDeleteOp} from '../../storage/framework/IDeleteOp';


export class DistributedRemoveOp<T>
  extends AbstractMessage<DistributedRemoveRequest, DistributedRemoveResponse>
  implements IDeleteOp<T> {

  protected findConditions: any;

  protected entityType: Function | ClassType<T> | string;

  protected entityControllerRegistry: EntityControllerRegistry;

  constructor(system: System, entityControllerRegistry: EntityControllerRegistry) {
    super(system, DistributedRemoveRequest, DistributedRemoveResponse);
    this.entityControllerRegistry = entityControllerRegistry;
    this.timeout = 10000;
  }

  getConditions(): any {
    return null;
  }

  getRemovable(): T | T[] | ClassType<T> {
    return null;
  }

  getOptions(): IDistributedRemoveOptions {
    return this.options;
  }

  prepare(controller: DistributedStorageEntityController) {
    return this;
  }


  doPostProcess(responses: DistributedRemoveResponse[], err?: Error): any {
    return responses;
  }

  async run(object: T[] | ClassType<T> | T, conditions?: any, options?: IDistributedRemoveOptions): Promise<T[] | number | T> {
    return null;
  }

}


