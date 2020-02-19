import {ISaveOptions} from './framework/ISaveOptions';
import {IFindOptions} from './framework/IFindOptions';
import {ClassType} from 'commons-schema-api/browser';
import {IUpdateOptions} from './framework/IUpdateOptions';
import {IAggregateOptions} from './framework/IAggregateOptions';
import {IDeleteOptions} from './framework/IDeleteOptions';

export interface IEntityController {

  findOne<T>(fn: Function | string, conditions: any, options?: IFindOptions): Promise<T>;

  find<T>(fn: Function | string, conditions: any, options: IFindOptions): Promise<T[]>;

  save<T>(object: T, options?: ISaveOptions): Promise<T>;

  save<T>(object: T[], options?: ISaveOptions): Promise<T[]>;

  remove<T>(object: T, options?: IDeleteOptions): Promise<T>;

  remove<T>(object: T[], options?: IDeleteOptions): Promise<T[]>;

  remove<T>(cls: ClassType<T>, condition: any, options?: IDeleteOptions): Promise<number>;

  update<T>(cls: ClassType<T>, condition: any, update: any, options?: IUpdateOptions): Promise<number>;

  aggregate<T>(baseClass: ClassType<T>, pipeline: any[], options?: IAggregateOptions): Promise<any[]>;

}