import {AbstractEvent} from "../events/AbstractEvent";
import {CryptUtils, IFindOptions} from "../..";

export class QueryEvent extends AbstractEvent {

  queryId: string = CryptUtils.shorthash('qevent-' + (new Date()).getTime() + '' + (AbstractEvent.inc++));

  entityType: string;


  conditions: any;

  options: IFindOptions;
  /*
    sort: any;


    limit: number = 100;


    offset: number = 0;
  */

}
