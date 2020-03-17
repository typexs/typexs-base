import {AbstractEvent} from '../../messaging/AbstractEvent';
import {IDistributedSaveOptions} from './IDistributedSaveOptions';

export class DistributedSaveResponse extends AbstractEvent {

  // queryId: string;

  options: IDistributedSaveOptions;

  // forbidden = false;

  results: { [type: string]: any[] } = {};
}
