import {IAggregateOptions} from './IAggregateOptions';
import {ClassType} from 'commons-schema-api/browser';

export interface IAggregateOp {

  getEntityType(): Function | string | ClassType<any>;

  getPipeline(): any[];

  getOptions(): IAggregateOptions;

  run(entryType: Function | string | ClassType<any>, pipeline: any[], options?: IAggregateOptions): Promise<any[]>;
}
