import {PAst} from './PAst';
import {MangoExpression} from '../MangoExpression';
import {IMangoWalker} from '../IMangoWalker';
import {NotYetImplementedError} from 'commons-base/browser';

export abstract class PValue extends PAst {

  value: any;

  constructor(e: MangoExpression, value: any, p?: PAst, k?: string | number) {
    super(e, p, k);
    this.value = value;
  }

  getKey(key: string): PAst {
    throw new NotYetImplementedError();
  }

  visit(o: IMangoWalker): any {
    return o.onValue(this);
  }
}
