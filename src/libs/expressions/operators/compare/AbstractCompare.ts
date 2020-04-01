import {AbstractOperator} from '../AbstractOperator';

export abstract class AbstractCompare extends AbstractOperator {

  op: string;


  validate(def: any): boolean {
    this.value = this.base.interprete(def, this, this.key);
    return true;
  }


}
