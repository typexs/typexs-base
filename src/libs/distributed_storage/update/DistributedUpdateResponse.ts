import {AbstractEvent} from '../../messaging/AbstractEvent';

export class DistributedUpdateResponse extends AbstractEvent {

  affected: number;
}
