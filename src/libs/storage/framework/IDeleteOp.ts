import {ClassType} from '@allgemein/schema-api';
import {IDeleteOptions} from './IDeleteOptions';

export interface IDeleteOp<T> {

  getRemovable(): T | T[] | ClassType<T>;

  getOptions(): IDeleteOptions;

  getConditions(): any;

  run(object: T | T[] | ClassType<T>, conditions?: any): Promise<T | T[] | number>;

}
