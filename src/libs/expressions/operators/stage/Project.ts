import {AbstractOperator} from '../AbstractOperator';
import {PAst} from '../../ast/PAst';
import {IMangoWalker, IMangoWalkerControl} from '../../IMangoWalker';
import {MangoExpression} from '../../MangoExpression';
import {Context} from '../../ast/Context';
import {AUTO_EQUAL_CONV_SUPPORT, NUMBER_PROJECT_SUPPORT} from '../../Constants';

export class Project extends AbstractOperator {

  static NAME = 'project';

  name = Project.NAME;


  constructor(e: MangoExpression, p?: PAst, ctxt?: Context) {
    super(e, p, ctxt);
    this.context.set(AUTO_EQUAL_CONV_SUPPORT, false);
    this.context.set(NUMBER_PROJECT_SUPPORT, true);
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
