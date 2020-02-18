import {ISaveOptions} from './ISaveOptions';

export interface ISaveOp<T> {
  run(object: T | T[], options?: ISaveOptions): Promise<T | T[]>;
}
