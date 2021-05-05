import {IAggregateOptions} from './IAggregateOptions';
import {ClassType} from '@allgemein/schema-api';

export interface IAggregateOp {

  getEntityType(): Function | string | ClassType<any>;

  getPipeline(): any[];

  getOptions(): IAggregateOptions;

  run(entryType: Function | string | ClassType<any>, pipeline: any[], options?: IAggregateOptions): Promise<any[]>;
}
