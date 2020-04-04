import * as _ from 'lodash';
import {AbstractOperator} from '../AbstractOperator';
import {PAst} from '../../ast/PAst';
import {Context} from '../../ast/Context';

export class ToLower extends AbstractOperator {

  static NAME = 'toLower';

  name = ToLower.NAME;

  args: any[] = [];


  validate(def: any): boolean {
    if (_.isString(def)) {
      this.value = this.base.interprete(def, this, new Context(this.key));
      return true;
    }
    return false;
  }

}
