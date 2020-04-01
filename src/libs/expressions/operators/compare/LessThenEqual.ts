import {AbstractOperator} from '../AbstractOperator';
import {PValue} from '../../ast/PValue';
import {AbstractCompare} from './AbstractCompare';

export class LessThenEqual extends AbstractCompare {

  static NAME = 'le';

  name = LessThenEqual.NAME;

  value: PValue;

  op: string = '<=';


}
