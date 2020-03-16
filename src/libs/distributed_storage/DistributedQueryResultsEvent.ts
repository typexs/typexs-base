import {AbstractEvent} from '../messaging/AbstractEvent';

export class DistributedQueryResultsEvent extends AbstractEvent {

  queryId: string;

  forbidden = false;

  results: any[] = [];

  count: number;

  limit: number;

  offset: number;
}
