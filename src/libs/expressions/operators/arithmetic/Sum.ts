import {AbstractOperator} from '../AbstractOperator';

export class Sum extends AbstractOperator {

  static NAME = 'sum';

  name = Sum.NAME;
  //
  //
  // validate(def: any): boolean {
  //   this.value = this.base.interprete(def, this, this.key);
  //   return true;
  // }

}
