import {ISaveOptions} from './framework/ISaveOptions';
import {IFindOptions} from './framework/IFindOptions';
import {ClassType} from 'commons-schema-api/browser';

export interface IEntityController {

  findOne<T>(fn: Function | string, conditions: any, options?: IFindOptions): Promise<T>;

  find<T>(fn: Function | string, conditions: any, options: IFindOptions): Promise<T[]>;

  save<T>(object: T, options?: ISaveOptions): Promise<T>;

  save<T>(object: T[], options?: ISaveOptions): Promise<T[]>;

  remove<T>(object: T): Promise<T>;

  remove<T>(object: T[]): Promise<T[]>;

  remove<T>(cls: ClassType<T>, condition: any): Promise<T[]>;

  update<T>(cls: ClassType<T>, condition: any, update: any): Promise<T[]>;

  aggregate<T>(baseClass: ClassType<T>, aggregationPipeline: any): Promise<T[]>;

}
