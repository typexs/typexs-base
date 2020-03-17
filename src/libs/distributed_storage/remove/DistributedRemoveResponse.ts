import {AbstractEvent} from '../../messaging/AbstractEvent';

export class DistributedRemoveResponse extends AbstractEvent {

  results: any[] = [];

  count: number;

  limit: number;

  offset: number;
}
