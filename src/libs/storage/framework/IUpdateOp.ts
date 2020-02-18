import {ClassType} from 'commons-schema-api/browser';
import {IUpdateOptions} from './IUpdateOptions';


export interface IUpdateOp<T> {
  run(cls: ClassType<T>, condition: any, update: any, options?: IUpdateOptions): Promise<number>;
}
