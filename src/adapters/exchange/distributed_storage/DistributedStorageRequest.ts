import {AbstractEvent} from '../../../libs/messaging/AbstractEvent';
import {DS_OPERATION} from '../../../libs/distributed_storage/Constants';
import {IDistributedFindOptions} from '../../../libs/distributed_storage/IDistributedFindOptions';
import {IDistributedSaveOptions} from '../../../libs/distributed_storage/IDistributedSaveOptions';

export class DistributedStorageRequest extends AbstractEvent {

  op: DS_OPERATION;

  entityType: string;

  condition: any;

  options: IDistributedFindOptions | IDistributedSaveOptions;

  objects: { [type: string]: any[] } = {};

  isArray: boolean;
}
