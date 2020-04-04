import {AbstractOperator} from '../AbstractOperator';
import {IMangoWalker, IMangoWalkerControl} from '../../IMangoWalker';
import {MangoExpression} from '../../MangoExpression';
import {PAst} from '../../ast/PAst';
import {Context} from '../../ast/Context';
import {AUTO_EQUAL_CONV_SUPPORT} from '../../Constants';
import * as _ from 'lodash';

export const GROUP_ID = 'GROUP_ID';

export class Group extends AbstractOperator {

  static NAME = 'group';

  name = Group.NAME;

  _id: PAst;

  constructor(e: MangoExpression, p?: PAst, ctxt?: Context) {
    super(e, p, ctxt);
    this.context.set(AUTO_EQUAL_CONV_SUPPORT, false);
  }


  visit(o: IMangoWalker): any {
    const state: IMangoWalkerControl = {};
    const r = o.visitOperator(this, state);
    if (state && state.abort) {
      return r;
    }
    const _id = this._id.visit(o);
    const relts = this.value.visit(o);
    relts['_id'] = _id;
    return o.leaveOperator(relts, this);
  }


  validate(def: any): boolean {
    let ctxt = new Context('_id');
    ctxt.set(GROUP_ID, true);
    this._id = this.base.interprete(def['_id'], this, ctxt);
    const defClone = _.cloneDeep(def);
    delete defClone['_id'];
    ctxt = new Context(this.key);
    this.value = this.base.interprete(defClone, this, ctxt);
    return true;
  }
}
