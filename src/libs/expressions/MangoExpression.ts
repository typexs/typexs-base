import {PAst} from './ast/PAst';
import * as _ from 'lodash';
import {ValueRef} from './ast/ValueRef';
import {Value} from './ast/Value';
import {PArray} from './ast/PArray';
import {PObject} from './ast/PObject';
import {Operators} from './operators/Operators';
import {IMangoWalker} from './IMangoWalker';

export class MangoExpression {

  readonly root: PAst = null;

  constructor(def: any) {
    this.root = this.interprete(def);
  }

  getKey(key: string) {
    return this.root.getKey(key);
  }

  getRoot() {
    return this.root;
  }

  interprete(def: any, p?: PAst, sourceKey?: string | number) {
    if (_.isString(def) ||
      _.isNumber(def) ||
      _.isDate(def) || _.isNull(def) ||
      _.isBoolean(def)) {
      const isRef = _.isString(def) && def.match(/^\$(.+)/);
      if (isRef) {
        return new ValueRef(this, isRef[1], p, sourceKey);
      } else {
        return new Value(this, def, p, sourceKey);
      }
    } else if (_.isArray(def)) {
      return new PArray(this, def, p, sourceKey);
    } else if (_.isObjectLike(def)) {
      const k = _.keys(def);
      if (k.length === 1 && /^\$/.test(k[0])) {
        const operatorKey = k[0];
        const follow = def[operatorKey];
        const operatorKey1 = operatorKey.replace(/^\$/, '');
        const operator = Operators.create(operatorKey1, this, p, sourceKey);
        if (!operator.validate(follow)) {
          throw new Error(`operator ${operatorKey} has no valid definition ${JSON.stringify(def)}`);
        }
        return operator;
      } else {
        return new PObject(this, def, p, sourceKey);
      }
    }
    throw new Error(`not yet implemented for ${def}`);
  }


  visit(o: IMangoWalker) {
    return this.root.visit(o);
  }

}
