import {ISaveOptions} from './framework/ISaveOptions';
import {IFindOptions} from './framework/IFindOptions';
import {IEntityRef} from '@allgemein/schema-api';
import {IUpdateOptions} from './framework/IUpdateOptions';
import {IAggregateOptions} from './framework/IAggregateOptions';
import {IDeleteOptions} from './framework/IDeleteOptions';
import {CLS_DEF} from '../Constants';


export interface IEntityController {

  name(): string;

  forClass(cls: CLS_DEF<any>): IEntityRef;

  findOne<T>(fn: CLS_DEF<T>, conditions?: any, options?: IFindOptions): Promise<T>;

  find<T>(fn: CLS_DEF<T>, conditions?: any, options?: IFindOptions): Promise<T[]>;

  save<T>(object: T, options?: ISaveOptions): Promise<T>;

  save<T>(object: T[], options?: ISaveOptions): Promise<T[]>;

  remove<T>(object: T | T[], options?: IDeleteOptions): Promise<number>;

  remove<T>(cls: CLS_DEF<T>, condition?: any, options?: IDeleteOptions): Promise<number>;

  update<T>(cls: CLS_DEF<T>, condition: any, update: any, options?: IUpdateOptions): Promise<number>;

  aggregate<T>(baseClass: CLS_DEF<T>, pipeline: any[], options?: IAggregateOptions): Promise<any[]>;

}
