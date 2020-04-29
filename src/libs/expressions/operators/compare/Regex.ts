import * as _ from 'lodash';
import {PAst} from '../../ast/PAst';
import {AbstractCompare} from './AbstractCompare';
import {IMangoWalker} from '../../IMangoWalker';
import {MultiArgs} from '../../ast/MultiArgs';

export class Regex extends AbstractCompare {

  static NAME = 'regex';

  name = Regex.NAME;

  value: PAst;

  regexp: string;

  options: string;

  validate(def: any, full?: any): boolean {
    if (_.isString(def)) {
      this.regexp = def;
      if (_.has('$options', full)) {
        this.options = full['$options'];
      }
      return true;
    } else if (def instanceof RegExp) {
      this.regexp = def.source;
      this.options = def.flags;
      return true;
    }
    return false;
  }


  visit(o: IMangoWalker): any {
    if (this.regexp) {
      return o.onOperator(this, new MultiArgs(this.regexp, this.options));
    }
    return o.onOperator(this, null);
  }


}
