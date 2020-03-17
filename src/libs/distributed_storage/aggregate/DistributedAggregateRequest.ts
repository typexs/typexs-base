import {AbstractEvent} from '../../messaging/AbstractEvent';
import {IDistributedAggregateOptions} from './IDistributedAggregateOptions';

export class DistributedAggregateRequest extends AbstractEvent {

  entityType: string;

  conditions: any;

  options: IDistributedAggregateOptions;
}
