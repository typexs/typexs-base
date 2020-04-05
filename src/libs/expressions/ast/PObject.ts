import * as _ from 'lodash';
import {PAst} from './PAst';
import {ValueRef} from './ValueRef';
import {Unset} from './Unset';
import {MangoExpression} from '../MangoExpression';
import {IMangoWalker, IMangoWalkerControl} from '../IMangoWalker';
import {Equal} from '../operators/compare/Equal';
import {Context} from './Context';
import {AUTO_EQUAL_CONV_SUPPORT, NUMBER_PROJECT_SUPPORT} from '../Constants';

export class PObject extends PAst {

  children: { [k: string]: PAst } = {};

  _keys: string[];


  constructor(e: MangoExpression, kv: any, p?: PAst, ctxt?: Context) {
    super(e, p, ctxt);
    this.interprete(kv);
  }

  getKey(key: string): PAst {
    if (this.children[key]) {
      return this.children[key];
    }
    return null;
    // throw new NotYetImplementedError();
  }

  keys() {
    const prefix = (this.key && _.isString(this.key) ? this.key + '.' : '');
    const keys: string[] = [];
    for (const k of this._keys) {
      const subkey = this.children[k].keys();
      subkey.forEach(x => {
        keys.push(prefix + x);
      });
    }
    return keys;
  }


  visit(o: IMangoWalker): any {
    const state: IMangoWalkerControl = {};
    const r = o.visitObject(this, state);
    if (state && state.abort) {
      return r;
    }

    for (const k of this._keys) {
      r[k] = this.children[k].visit(o);
    }
    return o.leaveObject(r, this);
  }


  getValues() {
    return _.values(this.children);
  }


  interprete(kv: any) {
    this._keys = _.keys(kv);

    const autoEqualSupport = !!this.context.get(AUTO_EQUAL_CONV_SUPPORT);
    const numberProjectSupport = !!this.context.get(NUMBER_PROJECT_SUPPORT);

    for (const k of this._keys) {
      const ctxt = new Context(k);
      const v = kv[k];
      if (!autoEqualSupport) {
        if (numberProjectSupport && _.isNumber(v) && (v === 1 || v === 0)) {
          if (v === 1) {
            this.children[k] = new ValueRef(this.base, k, this, ctxt);
          } else {
            this.children[k] = new Unset(this.base, k, this, ctxt);
          }
        } else {
          this.children[k] = this.base.interprete(v, this, ctxt);
        }
      } else {
        if (_.isObjectLike(v) || _.isArray(v)) {
          this.children[k] = this.base.interprete(v, this, ctxt);
        } else {
          const eq = new Equal(this.base, this, ctxt);
          this.children[k] = eq;
          eq.validate(v);
        }
      }
    }
  }


}
