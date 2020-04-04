import {AbstractOperator} from '../AbstractOperator';

export class Multiply extends AbstractOperator {

  static NAME = 'multiply';

  name = Multiply.NAME;
  //
  //
  // validate(def: any): boolean {
  //   this.value = this.base.interprete(def, this, this.key);
  //   return true;
  // }

}
