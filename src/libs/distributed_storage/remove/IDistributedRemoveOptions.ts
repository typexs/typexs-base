import {IDeleteOptions} from '../../storage/framework/IDeleteOptions';
import {IMessageOptions} from '../../messaging/IMessageOptions';

export interface IDistributedRemoveOptions extends IDeleteOptions, IMessageOptions {

  contollerHint?: { className?: string, name?: string };
  
}
