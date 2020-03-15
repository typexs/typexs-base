import {ClassType} from 'commons-schema-api/browser';
import {IUpdateOptions} from './IUpdateOptions';


export interface IUpdateOp<T> {

  getConditions(): any;

  getUpdate(): any;

  getEntityType(): ClassType<T>;

  getOptions(): IUpdateOptions;

  run(cls: ClassType<T>, condition: any, update: any, options?: IUpdateOptions): Promise<number>;

}
