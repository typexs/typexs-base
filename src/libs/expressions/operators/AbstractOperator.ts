import {PAst} from '../ast/PAst';
import {MangoExpression} from '../MangoExpression';
import {IMangoWalker} from '../IMangoWalker';

export abstract class AbstractOperator extends PAst {

  readonly name: string;

  value: PAst;

  constructor(e: MangoExpression, p?: PAst, k?: string) {
    super(e, p, k);
  }

  getKey(key: string): PAst {
    if (key === this.name || key.replace(/^\$/, '') === this.name || this.key === key) {
      return this;
    }
    return null;
  }



  validate(def: any): boolean {
    this.value = this.base.interprete(def, this, this.key);
    return true;
  }

  visit(o: IMangoWalker): any {
    if (this.value) {
      return o.onOperator(this, this.value.visit(o));
    }
    return o.onOperator(this, null);
  }

}
