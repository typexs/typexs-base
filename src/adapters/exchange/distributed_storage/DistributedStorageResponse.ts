import {AbstractEvent} from '../../../libs/messaging/AbstractEvent';
import {DS_OPERATION} from '../../../libs/distributed_storage/Constants';

export class DistributedStorageResponse extends AbstractEvent {

  op: DS_OPERATION;

  count: number;

  limit: number;

  offset: number;

  results: any[];


}
