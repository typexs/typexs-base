import {IFindOptions} from "./IFindOptions";

export interface IFindOp<T> {

  run(entityType: Function | string, findConditions: any, options?:IFindOptions): Promise<T[]>;

}
