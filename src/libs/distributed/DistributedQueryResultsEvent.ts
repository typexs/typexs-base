import {AbstractEvent} from '../messaging/AbstractEvent';

export class DistributedQueryResultsEvent extends AbstractEvent {

  queryId: string;

  error: string;

  forbidden = false;

  results: any[] = [];

  count: number;

  limit: number;

  offset: number;
}
