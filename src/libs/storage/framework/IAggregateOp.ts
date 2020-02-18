import {IAggregateOptions} from './IAggregateOptions';

export interface IAggregateOp {
  run(entryType: Function | string, pipeline: any[], options?: IAggregateOptions): Promise<any[]>;
}
