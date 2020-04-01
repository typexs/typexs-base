import {AbstractOperator} from '../AbstractOperator';

export class Count extends AbstractOperator {

  static NAME = 'count';

  name = Count.NAME;

  //
  // validate(def: any): boolean {
  //   this.value = this.base.interprete(def, this, this.key);
  //   return true;
  // }

}
