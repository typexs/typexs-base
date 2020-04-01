import * as _ from 'lodash';
import {AbstractOperator} from '../AbstractOperator';
import {PAst} from '../../ast/PAst';

export class ToLower extends AbstractOperator {

  static NAME = 'toLower';

  name = ToLower.NAME;

  value: PAst;

  args: any[] = [];


  validate(def: any): boolean {
    if (_.isString(def)) {
      this.value = this.base.interprete(def, this, this.key);
      return true;
    }
    return false;
  }

}
