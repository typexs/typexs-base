import {AbstractEvent} from '../events/AbstractEvent';
import {IFindOptions} from '../storage/framework/IFindOptions';
import {CryptUtils} from 'commons-base/browser';

export class DistributedQueryEvent extends AbstractEvent {

  queryId: string = CryptUtils.shorthash('qevent-' + (new Date()).getTime() + '' + (AbstractEvent.inc++));

  entityType: string;


  conditions: any;


  options: IFindOptions;
}
