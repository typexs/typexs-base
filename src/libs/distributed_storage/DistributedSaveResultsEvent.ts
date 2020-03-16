import {AbstractEvent} from '../messaging/AbstractEvent';
import {ISaveOptions} from '../storage/framework/ISaveOptions';

export class DistributedSaveResultsEvent extends AbstractEvent {

  // queryId: string;

  options: ISaveOptions;

  // forbidden = false;

  results: { [type: string]: any[] } = {};
}
