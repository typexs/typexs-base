import {AbstractEvent} from '../messaging/AbstractEvent';
import {ISaveOptions} from '../storage/framework/ISaveOptions';

export class DistributedSaveResultsEvent extends AbstractEvent {

  queryId: string;

  options: ISaveOptions;

  error: string;

  forbidden = false;

  results: { [type: string]: any[] } = {};
}
