import {PAst} from './PAst';
import {MangoExpression} from '../MangoExpression';
import {IMangoWalker} from '../IMangoWalker';
import {NotYetImplementedError} from 'commons-base/browser';
import {Context} from './Context';

export abstract class PValue extends PAst {

  value: any;

  constructor(e: MangoExpression, value: any, p?: PAst, ctxt?: Context) {
    super(e, p, ctxt);
    this.value = value;
  }

  getKey(key: string): PAst {
    throw new NotYetImplementedError();
  }

  visit(o: IMangoWalker): any {
    return o.onValue(this);
  }
}
