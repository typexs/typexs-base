import {ClassType} from 'commons-schema-api/browser';

export interface IDeleteOp<T> {
  run(object: T | T[] | ClassType<T>, conditions?: any): Promise<T | T[] | number>;

}
