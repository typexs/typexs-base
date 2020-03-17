import {AbstractEvent} from '../../messaging/AbstractEvent';

export class DistributedAggregateResponse extends AbstractEvent {

  results: any[] = [];

  count: number;

  limit: number;

  offset: number;
}
