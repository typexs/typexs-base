import {AbstractOperator} from '../AbstractOperator';
import {PAst} from '../../ast/PAst';
import {IMangoWalker, IMangoWalkerControl} from '../../IMangoWalker';

export class Skip extends AbstractOperator {

  static NAME = 'skip';

  name = Skip.NAME;


}
