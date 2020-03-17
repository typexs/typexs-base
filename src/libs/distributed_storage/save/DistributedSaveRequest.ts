import {AbstractEvent} from '../../messaging/AbstractEvent';
import {IDistributedSaveOptions} from './IDistributedSaveOptions';

export class DistributedSaveRequest extends AbstractEvent {

  objects: { [type: string]: any[] } = {};

  options: IDistributedSaveOptions;
}
