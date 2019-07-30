import {AbstractEvent} from '../events/AbstractEvent';
import {CryptUtils} from '../utils/CryptUtils';
import {IFindOptions} from '../storage/framework/IFindOptions';

export class DistributedQueryEvent extends AbstractEvent {

  queryId: string = CryptUtils.shorthash('qevent-' + (new Date()).getTime() + '' + (AbstractEvent.inc++));

  entityType: string;


  conditions: any;


  options: IFindOptions;
}
