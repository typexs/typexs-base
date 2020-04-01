import {AbstractOperator} from '../AbstractOperator';
import {PValue} from '../../ast/PValue';
import {AbstractCompare} from './AbstractCompare';

export class GreaterThenEqual extends AbstractCompare {

  static NAME = 'ge';

  name = GreaterThenEqual.NAME;

  value: PValue;

  op: string = '>=';


}
