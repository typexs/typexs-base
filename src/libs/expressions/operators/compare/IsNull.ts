import {AbstractOperator} from '../AbstractOperator';
import {PValue} from '../../ast/PValue';
import {AbstractCompare} from './AbstractCompare';

export class IsNull extends AbstractCompare {

  static NAME = 'isNull';

  name = IsNull.NAME;

  value: PValue;

  op: string = 'IS NULL';


}
