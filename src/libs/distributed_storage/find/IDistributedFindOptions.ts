import {IFindOptions} from '../../storage/framework/IFindOptions';
import {IMessageOptions} from '../../messaging/IMessageOptions';

export interface IDistributedFindOptions extends IFindOptions, IMessageOptions {

  contollerHint?: { className?: string, name?: string };
}
