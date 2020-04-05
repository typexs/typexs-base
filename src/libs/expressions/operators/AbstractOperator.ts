import {PAst} from '../ast/PAst';
import {MangoExpression} from '../MangoExpression';
import {IMangoWalker} from '../IMangoWalker';
import {Context} from '../ast/Context';

export abstract class AbstractOperator extends PAst {

  readonly name: string;

  value: PAst;

  constructor(e: MangoExpression, p?: PAst, ctxt?: Context) {
    super(e, p, ctxt);
  }

  getKey(key: string): PAst {
    if (key === this.name || key.replace(/^\$/, '') === this.name || this.key === key) {
      return this;
    }
    return null;
  }


  validate(def: any, full?: any): boolean {
    const ctxt = new Context(this.key);
    this.value = this.base.interprete(def, this, ctxt);
    return true;
  }

  visit(o: IMangoWalker): any {
    if (this.value) {
      return o.onOperator(this, this.value.visit(o));
    }
    return o.onOperator(this, null);
  }

}
