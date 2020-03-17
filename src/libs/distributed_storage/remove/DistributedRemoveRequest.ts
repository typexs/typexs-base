import {AbstractEvent} from '../../messaging/AbstractEvent';
import {IDistributedRemoveOptions} from './IDistributedRemoveOptions';

export class DistributedRemoveRequest extends AbstractEvent {

  options: IDistributedRemoveOptions;
}
