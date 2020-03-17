import {IFindOptions} from '../../storage/framework/IFindOptions';

export interface IDistributedFindOptions extends IFindOptions {

  targetIds?: string[];

  timeout?: number;

  contollerHint?: { className?: string, name?: string };
}
