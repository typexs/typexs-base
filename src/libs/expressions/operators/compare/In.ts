import {AbstractOperator} from '../AbstractOperator';
import {PValue} from '../../ast/PValue';
import {AbstractCompare} from './AbstractCompare';

export class In extends AbstractCompare {

  static NAME = 'in';

  name = In.NAME;

  value: PValue;

  op: string = 'IN';

}
