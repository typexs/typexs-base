import {AbstractEvent} from '../../messaging/AbstractEvent';
import {IDistributedUpdateOptions} from './IDistributedUpdateOptions';

export class DistributedUpdateRequest extends AbstractEvent {

  entityType: string;

  conditions: any;

  update: any;

  options: IDistributedUpdateOptions;
}
