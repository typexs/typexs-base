import {AbstractOperator} from '../AbstractOperator';
import {PValue} from '../../ast/PValue';
import {AbstractCompare} from './AbstractCompare';

export class Like extends AbstractCompare {

  static NAME = 'like';

  name = Like.NAME;

  value: PValue;

  op: string = 'LIKE';


}
