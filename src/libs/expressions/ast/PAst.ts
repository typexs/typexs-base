import {MangoExpression} from '../MangoExpression';
import {IMangoWalker} from '../IMangoWalker';
import {Context} from './Context';

export abstract class PAst {

  readonly base: MangoExpression;

  readonly parent: PAst;

  readonly key: string | number;

  readonly context: Context = new Context();


  constructor(e: MangoExpression, p: PAst, ctxt?: Context) {
    this.base = e;
    this.parent = p;
    if (ctxt) {
      this.key = ctxt.key;
      this.context.merge(ctxt);
    }
  }


  keys() {
    const keys = [this.key];
    return keys;
  }


  /**
   * function execute on self and parents
   *
   * @param fn
   * @param self
   */
  backwardCall(fn: (x: PAst) => boolean, self: boolean = true): any {
    if (self && fn(this)) {
      return true;
    }
    if (this.parent) {
      return this.parent.backwardCall(fn, true);
    }
    return null;
  }


  /**
   * check if the self or nodes branch is in some sublying context
   *
   * @param ctxt
   * @param selfCheck
   */
  isInContext(ctxt: string, selfCheck: boolean = true): boolean {
    if (this.context.has(ctxt) && selfCheck) {
      return true;
    }
    if (this.parent) {
      return this.parent.isInContext(ctxt, true);
    }
    return false;
  }

  abstract getKey(key: string): PAst;


  abstract visit(o: IMangoWalker): any;

}
