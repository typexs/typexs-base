import {AbstractOperator} from '../AbstractOperator';
import {PAst} from '../../ast/PAst';
import {IMangoWalker, IMangoWalkerControl} from '../../IMangoWalker';
import {MangoExpression} from '../../MangoExpression';
import {Context} from '../../ast/Context';
import {AUTO_EQUAL_CONV_SUPPORT} from '../../Constants';

export class Skip extends AbstractOperator {

  static NAME = 'skip';

  name = Skip.NAME;


  constructor(e: MangoExpression, p?: PAst, ctxt?: Context) {
    super(e, p, ctxt);
    this.context.set(AUTO_EQUAL_CONV_SUPPORT, false);
  }

}
