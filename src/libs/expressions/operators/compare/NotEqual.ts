import {AbstractOperator} from '../AbstractOperator';
import {PValue} from '../../ast/PValue';
import {AbstractCompare} from './AbstractCompare';

export class NotEqual extends AbstractCompare {

  static NAME = 'ne';

  name = NotEqual.NAME;

  value: PValue;

  op: string = '<>';



}
