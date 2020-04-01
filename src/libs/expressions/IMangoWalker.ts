import {PAst} from './ast/PAst';

export interface IMangoWalkerControl {
  abort?: boolean;
}

export interface IMangoWalker {

  // on(entry: any): any;

  /**
   * return the array
   *
   * @param ast
   */
  visitArray(ast: PAst, ctrl?: IMangoWalkerControl): any[];

  leaveArray(res: any[], ast: PAst): any;

  visitObject(ast: PAst, ctrl?: IMangoWalkerControl): any;

  leaveObject(res: any, ast: PAst): any;

  onValue(ast: PAst, ctrl?: IMangoWalkerControl): any;

  onOperator(ast: PAst, valueRes: any, ctrl?: IMangoWalkerControl): any;

  visitOperator(ast: PAst, ctrl?: IMangoWalkerControl): any;

  leaveOperator(res: any, ast: PAst): any;

}
