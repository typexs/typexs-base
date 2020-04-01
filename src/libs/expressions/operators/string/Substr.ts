import * as _ from 'lodash';
import {AbstractOperator} from '../AbstractOperator';
import {PAst} from '../../ast/PAst';

export class Substr extends AbstractOperator {

  static NAME = 'substr';

  name = Substr.NAME;

  value: PAst;

  args: any[] = [];


  validate(def: any): boolean {
    if (_.isArray(def) && def.length > 0 && def.length <= 3) {

      const v = def.shift();
      if (_.isString(v)) {
        this.value = this.base.interprete(v, this, this.key);
      }

      if (!this.value) {
        return false;
      }

      this.args = def;
      return true;
    }
    return false;
  }

}
