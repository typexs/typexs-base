import {AbstractOperator} from '../AbstractOperator';
import {PValue} from '../../ast/PValue';
import {AbstractCompare} from './AbstractCompare';

export class GreaterThen extends AbstractCompare {

  static NAME = 'gt';

  name = GreaterThen.NAME;

  value: PValue;

  op: string = '>';

}
