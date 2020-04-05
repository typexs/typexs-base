import * as _ from 'lodash';
import {AbstractOperator} from '../AbstractOperator';
import {PAst} from '../../ast/PAst';

export class Regex extends AbstractOperator {

  static NAME = 'substr';

  name = Regex.NAME;

  value: PAst;

  regexp: string;

  options: string;

  validate(def: any): boolean {
    if (_.isString(def)) {

    } else if (def instanceof RegExp) {
      // if (_.isString(def)) {
      //   this.value = this.base.interprete(v, this, new Context(this.key));
      // }
    }
    return true;
  }

}
