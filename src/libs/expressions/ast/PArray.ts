import {PAst} from './PAst';
import {MangoExpression} from '../MangoExpression';
import {IMangoWalker, IMangoWalkerControl} from '../IMangoWalker';
import {Context} from './Context';

export class PArray extends PAst {

  items: PAst[] = [];


  constructor(e: MangoExpression, kv: any[], p?: PAst, ctxt?: Context) {
    super(e, p, ctxt);
    this.interprete(kv);
  }

  getKey(key: string): PAst {
    for (const item of this.items) {
      const found = item.getKey(key);
      if (found) {
        return found;
      }
    }
    return null;
  }

  keys() {
    const keys: string[] = [];
    for (const item of this.items) {
      const subkey = item.keys();
      subkey.forEach((x: string) => {
        keys.push(x);
      });
    }
    return keys;
  }

  interprete(kv: any) {
    for (let i = 0; i < kv.length; i++) {
      const ctxt = new Context();
      ctxt.key = i;
      this.items[i] = this.base.interprete(kv[i], this, ctxt);
    }
  }

  visit(o: IMangoWalker): any {
    const state: IMangoWalkerControl = {};
    const res = o.visitArray(this, state);
    if (state && state.abort) {
      return res;
    }
    for (let i = 0; i < this.items.length; i++) {
      res.push(this.items[i].visit(o));
    }
    return o.leaveArray(res, this);
  }


}


