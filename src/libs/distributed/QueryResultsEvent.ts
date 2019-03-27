import {AbstractEvent} from "../events/AbstractEvent";

export class QueryResultsEvent extends AbstractEvent {

  queryId: string;

  error: string;

  results: any[] = [];

  count: number;

  limit: number;

  offset: number;
}