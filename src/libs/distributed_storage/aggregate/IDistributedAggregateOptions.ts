import {IAggregateOptions} from '../../storage/framework/IAggregateOptions';

export interface IDistributedAggregateOptions extends IAggregateOptions {

  targetIds?: string[];

  timeout?: number;

  contollerHint?: { className?: string, name?: string };
}
