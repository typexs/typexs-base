import {AbstractOperator} from '../AbstractOperator';
import {IMangoWalker, IMangoWalkerControl} from '../../IMangoWalker';

export class And extends AbstractOperator {

  static NAME = 'and';

  name = And.NAME;


  visit(o: IMangoWalker): any {
    const state: IMangoWalkerControl = {};
    const r = o.visitOperator(this, state);
    if (state && state.abort) {
      return r;
    }
    const relts = this.value.visit(o);
    return o.leaveOperator(relts, this);
  }

}
