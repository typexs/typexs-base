import {AbstractEvent} from '../events/AbstractEvent';
import {CryptUtils} from '../utils/CryptUtils';
import {ISaveOptions} from '../storage/framework/ISaveOptions';

export class DistributedSaveEvent extends AbstractEvent {

  queryId: string = CryptUtils.shorthash('dsevent-' + (new Date()).getTime() + '' + (AbstractEvent.inc++));


  objects: { [type: string]: any[] } = {};

  options: ISaveOptions;
}
