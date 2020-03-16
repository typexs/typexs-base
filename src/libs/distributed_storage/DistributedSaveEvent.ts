import {AbstractEvent} from '../messaging/AbstractEvent';
import {CryptUtils} from 'commons-base/browser';
import {IDistributedSaveOptions} from './IDistributedSaveOptions';

export class DistributedSaveEvent extends AbstractEvent {

    // queryId: string = CryptUtils.shorthash('dsevent-' + (new Date()).getTime() + '' + (AbstractEvent.inc++));


    objects: { [type: string]: any[] } = {};

    options: IDistributedSaveOptions;
}
