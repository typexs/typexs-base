import {IUpdateOptions} from '../../storage/framework/IUpdateOptions';
import {IMessageOptions} from '../../messaging/IMessageOptions';

export interface IDistributedUpdateOptions extends IUpdateOptions, IMessageOptions {

  contollerHint?: { className?: string, name?: string };

}
