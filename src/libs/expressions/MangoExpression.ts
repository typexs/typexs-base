import {PAst} from './ast/PAst';
import * as _ from 'lodash';
import {ValueRef} from './ast/ValueRef';
import {Value} from './ast/Value';
import {PArray} from './ast/PArray';
import {PObject} from './ast/PObject';
import {Operators} from './operators/Operators';
import {IMangoWalker} from './IMangoWalker';
import {Context} from './ast/Context';
import {AUTO_EQUAL_CONV_SUPPORT} from './Constants';

export class MangoExpression {

  readonly root: PAst = null;

  constructor(def: any) {
    // default change object assignment to value
    const ctxt = new Context();
    ctxt.set(AUTO_EQUAL_CONV_SUPPORT, true);
    this.root = this.interprete(def, null, ctxt);
  }

  getKey(key: string) {
    return this.root.getKey(key);
  }

  getRoot() {
    return this.root;
  }


  interprete(def: any, p?: PAst, ctxt?: Context) {
    const context = ctxt ? ctxt : new Context();
    if (p) {
      context.key = ctxt.key;
      context.merge(p.context);
    }
    // context.key = sourceKey ? sourceKey : undefined;
    let result: PAst = null;
    if (_.isString(def) ||
      _.isNumber(def) ||
      _.isDate(def) ||
      _.isNull(def) ||
      _.isBoolean(def)) {
      const isRef = _.isString(def) && def.match(/^\$(.+)/);
      if (isRef) {

        result = new ValueRef(this, isRef[1], p, context);
      } else {
        result = new Value(this, def, p, context);
      }
    } else if (_.isArray(def)) {
      result = new PArray(this, def, p, context);
    } else if (_.isObjectLike(def)) {
      const k = _.keys(def);
      if (k.length === 1 && /^\$/.test(k[0])) {
        const operatorKey = k[0];
        const follow = def[operatorKey];
        const operatorKey1 = operatorKey.replace(/^\$/, '');
        const operator = Operators.create(operatorKey1, this, p, context);
        if (!operator.validate(follow)) {
          throw new Error(`operator ${operatorKey} has no valid definition ${JSON.stringify(def)}`);
        }
        result = operator;
      } else {
        result = new PObject(this, def, p, context);
      }
    }

    if (!result) {
      throw new Error(`not yet implemented for ${def}`);
    }

    return result;

  }


  visit(o: IMangoWalker) {
    return this.root.visit(o);
  }

}
