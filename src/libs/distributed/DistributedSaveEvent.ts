import {AbstractEvent} from '../events/AbstractEvent';
import {ISaveOptions} from '../storage/framework/ISaveOptions';
import {CryptUtils} from 'commons-base/browser';

export class DistributedSaveEvent extends AbstractEvent {

  queryId: string = CryptUtils.shorthash('dsevent-' + (new Date()).getTime() + '' + (AbstractEvent.inc++));


  objects: { [type: string]: any[] } = {};

  options: ISaveOptions;
}
