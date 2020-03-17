import {AbstractEvent} from '../../messaging/AbstractEvent';
import {IDistributedFindOptions} from './IDistributedFindOptions';

export class DistributedFindRequest extends AbstractEvent {

  entityType: string;

  conditions: any;

  options: IDistributedFindOptions;
}
