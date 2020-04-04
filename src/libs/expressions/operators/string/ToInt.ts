import * as _ from 'lodash';
import {AbstractOperator} from '../AbstractOperator';
import {Context} from '../../ast/Context';

export class ToInt extends AbstractOperator {

  static NAME = 'toInt';

  name = ToInt.NAME;

  validate(def: any): boolean {
    if (_.isString(def)) {
      this.value = this.base.interprete(def, this, new Context(this.key));
      return true;
    }
    return false;
  }

}
