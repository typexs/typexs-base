import {DistributedStorageEntityController} from './../DistributedStorageEntityController';
import {System} from '../../system/System';
import {ClassType} from 'commons-schema-api';
import {AbstractMessage} from '../../messaging/AbstractMessage';
import {EntityControllerRegistry} from '../../storage/EntityControllerRegistry';
import {DistributedUpdateRequest} from './DistributedUpdateRequest';
import {DistributedUpdateResponse} from './DistributedUpdateResponse';
import {IDistributedUpdateOptions} from './IDistributedUpdateOptions';
import {IUpdateOp} from '../../storage/framework/IUpdateOp';
import {IUpdateOptions} from '../../storage/framework/IUpdateOptions';


export class DistributedUpdateOp<T>
  extends AbstractMessage<DistributedUpdateRequest, DistributedUpdateResponse>
  implements IUpdateOp<T> {

  constructor(system: System, entityControllerRegistry: EntityControllerRegistry) {
    super(system, DistributedUpdateRequest, DistributedUpdateResponse);
    this.entityControllerRegistry = entityControllerRegistry;
    this.timeout = 10000;
  }


  protected entityControllerRegistry: EntityControllerRegistry;

  conditions: any;

  update: any;

  entityType: ClassType<T>;


  getOptions(): IDistributedUpdateOptions {
    return this.options;
  }

  prepare(controller: DistributedStorageEntityController) {
    return this;
  }

  getConditions(): any {
    return this.conditions;
  }

  getUpdate(): any {
    return this.update;
  }

  getEntityType(): ClassType<T> {
    return this.entityType;
  }

  async run(cls: ClassType<T>, condition: any, update: any, options?: IUpdateOptions): Promise<number> {
    return 0;
  }

  doPostProcess(responses: DistributedUpdateResponse[], err?: Error): any {
    return responses;
  }


}


