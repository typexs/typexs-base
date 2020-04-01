import * as _ from 'lodash';
import {PAst} from './PAst';
import {ValueRef} from './ValueRef';
import {Unset} from './Unset';
import {MangoExpression} from '../MangoExpression';
import {IMangoWalker, IMangoWalkerControl} from '../IMangoWalker';
import {Project} from '../operators/stage/Project';
import {Equal} from '../operators/compare/Equal';
import {Group} from '../operators/stage/Group';
import {Sort} from '../operators/stage/Sort';

export class PObject extends PAst {

  children: { [k: string]: PAst } = {};

  _keys: string[];


  constructor(e: MangoExpression, kv: any, p?: PAst, k?: string | number) {
    super(e, p, k);
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
    const inprojection =
      !!this.testBackward(x =>
        x instanceof Project
      );

    const inGroup = !!this.testBackward(y => y instanceof Group);

    const skipping =
      !!this.testBackward(x =>
        (x.key === '_id' && inGroup) || x instanceof Sort
      ) || (this.key === '_id' && inGroup);

    for (const k of this._keys) {
      const v = kv[k];
      if (inprojection || skipping || (k === '_id' && inGroup)) {
        if (inprojection && _.isNumber(v) && (v === 1 || v === 0)) {
          if (v === 1) {
            this.children[k] = new ValueRef(this.base, k, this, k);
          } else {
            this.children[k] = new Unset(this.base, k, this, k);
          }
        } else {
          this.children[k] = this.base.interprete(v, this, k);
        }
      } else {
        if (_.isObjectLike(v) || _.isArray(v)) {
          this.children[k] = this.base.interprete(v, this, k);
        } else {
          const eq = new Equal(this.base, this, k);
          this.children[k] = eq;
          eq.validate(v);
        }
      }
    }
  }


}
