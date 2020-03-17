import {IUpdateOptions} from '../../storage/framework/IUpdateOptions';

export interface IDistributedUpdateOptions extends IUpdateOptions {

  targetIds?: string[];

  timeout?: number;

  contollerHint?: { className?: string, name?: string };
}
