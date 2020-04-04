import {AbstractOperator} from '../AbstractOperator';
import {PAst} from '../../ast/PAst';
import {MangoExpression} from '../../MangoExpression';
import {Context} from '../../ast/Context';
import {AUTO_EQUAL_CONV_SUPPORT} from '../../Constants';

export class Sort extends AbstractOperator {

  static NAME = 'sort';

  name = Sort.NAME;

  constructor(e: MangoExpression, p?: PAst, ctxt?: Context) {
    super(e, p, ctxt);
    this.context.set(AUTO_EQUAL_CONV_SUPPORT, false);
  }


}
