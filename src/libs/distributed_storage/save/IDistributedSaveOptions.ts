import {ISaveOptions} from '../../storage/framework/ISaveOptions';
import {IMessageOptions} from '../../messaging/IMessageOptions';


export interface IDistributedSaveOptions extends ISaveOptions, IMessageOptions {

  contollerHint?: { className?: string, name?: string };

}
