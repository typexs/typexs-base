import {IFindOptions} from '../storage/framework/IFindOptions';

export interface IDistributedFindOptions extends IFindOptions {
  targetIds?: string[];
}
