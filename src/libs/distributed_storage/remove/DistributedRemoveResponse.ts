import {AbstractEvent} from '../../messaging/AbstractEvent';

export class DistributedRemoveResponse extends AbstractEvent {

  affected: number;

  results: any;

}
