import {ISaveOptions} from './framework/ISaveOptions';
import {IFindOptions} from './framework/IFindOptions';
import {ClassType, IClassRef, IEntityRef} from 'commons-schema-api/browser';
import {IUpdateOptions} from './framework/IUpdateOptions';
import {IAggregateOptions} from './framework/IAggregateOptions';
import {IDeleteOptions} from './framework/IDeleteOptions';

export interface IEntityController {

  name(): string;

  forClass(cls: ClassType<any> | string | Function | IClassRef): IEntityRef;

  findOne<T>(fn: Function | string, conditions: any, options?: IFindOptions): Promise<T>;

  find<T>(fn: Function | string, conditions: any, options: IFindOptions): Promise<T[]>;

  save<T>(object: T, options?: ISaveOptions): Promise<T>;

  save<T>(object: T[], options?: ISaveOptions): Promise<T[]>;

  remove<T>(object: T, options?: IDeleteOptions): Promise<T>;

  remove<T>(object: T[], options?: IDeleteOptions): Promise<T[]>;

  remove<T>(cls: Function | ClassType<T>, condition: any, options?: IDeleteOptions): Promise<number>;

  update<T>(cls: Function | ClassType<T>, condition: any, update: any, options?: IUpdateOptions): Promise<number>;

  aggregate<T>(baseClass: Function | ClassType<T>, pipeline: any[], options?: IAggregateOptions): Promise<any[]>;

}
