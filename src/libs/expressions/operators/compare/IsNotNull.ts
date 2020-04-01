import {AbstractOperator} from '../AbstractOperator';
import {PValue} from '../../ast/PValue';
import {AbstractCompare} from './AbstractCompare';

export class IsNotNull extends AbstractCompare {

  static NAME = 'isNotNull';

  name = IsNotNull.NAME;

  value: PValue;

  op: string = 'IS NOT NULL';


}
