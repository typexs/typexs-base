import {AbstractOperator} from '../AbstractOperator';
import {PValue} from '../../ast/PValue';
import {AbstractCompare} from './AbstractCompare';

export class LessThen extends AbstractCompare {

  static NAME = 'lt';

  name = LessThen.NAME;

  value: PValue;

  op: string = '<';



}
