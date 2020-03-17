import {AbstractEvent} from '../../messaging/AbstractEvent';

export class DistributedUpdateResponse extends AbstractEvent {

  results: any[] = [];

  count: number;

  limit: number;

  offset: number;
}
