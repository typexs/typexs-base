import {ISaveOptions} from './ISaveOptions';

export interface ISaveOp<T> {

  getOptions(): ISaveOptions;

  getObjects(): T[];

  getIsArray(): boolean;


  run(object: T | T[], options?: ISaveOptions): Promise<T | T[]>;

}
