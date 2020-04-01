import {AbstractOperator} from '../AbstractOperator';
import {PValue} from '../../ast/PValue';
import {AbstractCompare} from './AbstractCompare';

export class NotIn extends AbstractCompare {

  static NAME = 'nin';

  name = NotIn.NAME;

  value: PValue;

  op: string = 'NOT IN';


}
