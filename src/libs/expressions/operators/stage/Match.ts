import {AbstractOperator} from '../AbstractOperator';
import {PAst} from '../../ast/PAst';
import {IMangoWalker, IMangoWalkerControl} from '../../IMangoWalker';

export class Match extends AbstractOperator {

  static NAME = 'match';

  name = Match.NAME;


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
