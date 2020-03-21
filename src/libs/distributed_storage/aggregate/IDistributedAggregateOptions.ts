import {IAggregateOptions} from '../../storage/framework/IAggregateOptions';
import {IMessageOptions} from '../../messaging/IMessageOptions';

export interface IDistributedAggregateOptions extends IAggregateOptions, IMessageOptions {

  contollerHint?: { className?: string, name?: string };
}
