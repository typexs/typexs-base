import {AbstractOperator} from '../AbstractOperator';
import {Context} from '../../ast/Context';

export abstract class AbstractCompare extends AbstractOperator {

  op: string;


  validate(def: any): boolean {
    this.value = this.base.interprete(def, this, new Context(this.key));
    return true;
  }


}
