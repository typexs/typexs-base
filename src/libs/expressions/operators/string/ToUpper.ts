import * as _ from 'lodash';
import {AbstractOperator} from '../AbstractOperator';
import {PAst} from '../../ast/PAst';
import {Context} from '../../ast/Context';

export class ToUpper extends AbstractOperator {
  static NAME = 'toUpper';

  name = ToUpper.NAME;

  value: PAst;

  validate(def: any): boolean {
    if (_.isString(def)) {
      this.value = this.base.interprete(def, this, new Context(this.key));
      return true;
    }
    return false;
  }

}
