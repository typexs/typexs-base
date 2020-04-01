import {AbstractOperator} from '../AbstractOperator';
import {PValue} from '../../ast/PValue';
import {AbstractCompare} from './AbstractCompare';

export class Equal extends AbstractCompare {

  static NAME = 'eq';

  name = Equal.NAME;

  value: PValue;

  op: string = '=';



}
