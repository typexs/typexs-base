import {DistributedStorageEntityController} from './../DistributedStorageEntityController';
import {System} from '../../system/System';
import {ClassType} from 'commons-schema-api';
import {AbstractMessage} from '../../messaging/AbstractMessage';
import {EntityControllerRegistry} from '../../storage/EntityControllerRegistry';
import {DistributedAggregateRequest} from './DistributedAggregateRequest';
import {DistributedAggregateResponse} from './DistributedAggregateResponse';
import {IDistributedAggregateOptions} from './IDistributedAggregateOptions';
import {IAggregateOp} from '../../storage/framework/IAggregateOp';
import {IAggregateOptions} from '../../storage/framework/IAggregateOptions';


export class DistributedAggregateOp
  extends AbstractMessage<DistributedAggregateRequest, DistributedAggregateResponse>
  implements IAggregateOp {


  protected entityControllerRegistry: EntityControllerRegistry;

  constructor(system: System, entityControllerRegistry: EntityControllerRegistry) {
    super(system, DistributedAggregateRequest, DistributedAggregateResponse);
    this.entityControllerRegistry = entityControllerRegistry;
    this.timeout = 10000;
  }


  getOptions(): IDistributedAggregateOptions {
    return this.options;
  }

  prepare(controller: DistributedStorageEntityController) {
    return this;
  }

  async run(entryType: Function | string | ClassType<any>, pipeline: any[], options?: IAggregateOptions): Promise<any[]> {
    return [];
  }

  doPostProcess(responses: DistributedAggregateResponse[], err?: Error): any {
    return responses;
  }

  getEntityType(): Function | string | ClassType<any> {
    return undefined;
  }

  getPipeline(): any[] {
    return [];
  }


}


