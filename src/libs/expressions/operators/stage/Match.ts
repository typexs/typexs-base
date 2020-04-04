import {AbstractOperator} from '../AbstractOperator';
import {IMangoWalker, IMangoWalkerControl} from '../../IMangoWalker';
import {MangoExpression} from '../../MangoExpression';
import {PAst} from '../../ast/PAst';
import {Context} from '../../ast/Context';
import {AUTO_EQUAL_CONV_SUPPORT} from '../../Constants';

export class Match extends AbstractOperator {

  static NAME = 'match';

  name = Match.NAME;

  constructor(e: MangoExpression, p?: PAst, ctxt?: Context) {
    super(e, p, ctxt);
    this.context.set(AUTO_EQUAL_CONV_SUPPORT, true);
  }


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
