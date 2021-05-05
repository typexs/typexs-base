import {IFindOptions} from './IFindOptions';
import {ClassType} from '@allgemein/schema-api';

export interface IFindOp<T> {

  getFindConditions(): any;

  getEntityType(): Function | string | ClassType<T>;

  getOptions(): IFindOptions;

  run(entityType: Function | string, findConditions: any, options?: IFindOptions): Promise<T[]>;

}
