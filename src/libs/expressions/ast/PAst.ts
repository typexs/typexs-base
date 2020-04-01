import {MangoExpression} from '../MangoExpression';
import {IMangoWalker} from '../IMangoWalker';

export abstract class PAst {

  readonly base: MangoExpression;

  readonly parent: PAst;

  readonly key: string | number;


  constructor(e: MangoExpression, p: PAst, k: string | number) {
    this.base = e;
    this.parent = p;
    this.key = k;
  }

  keys() {
    const keys = [this.key];
    return keys;
  }

  testBackward(fn: (x: PAst) => boolean): any {
    if (this.parent) {
      if (fn(this.parent)) {
        return this.parent;
      }
      return this.parent.testBackward(fn);
    }
    return null;
  }

  abstract getKey(key: string): PAst;


  abstract visit(o: IMangoWalker): any;

}
