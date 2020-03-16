import {Inject} from 'typedi';
import {DistributedOperationFactory} from './DistributedOperationFactory';
import {IDistributedFindOptions} from './IDistributedFindOptions';
import {IDistributedSaveOptions} from './IDistributedSaveOptions';
import {IEntityController} from '../storage/IEntityController';
import {ClassType} from 'commons-schema-api';
import {IUpdateOptions} from '../storage/framework/IUpdateOptions';
import {IAggregateOptions} from '../storage/framework/IAggregateOptions';


export class DistributedStorageEntityController implements IEntityController {


  @Inject()
  factory: DistributedOperationFactory;


  async findOne<T>(fn: Function | string, conditions: any = null, options: IDistributedFindOptions = {limit: 1}): Promise<T> {
    return this.find<T>(fn, conditions, options).then(r => r.shift());
  }


  async find<T>(fn: Function | string, conditions: any = null, options: IDistributedFindOptions = {limit: 100}): Promise<T[]> {
    return this.factory.createFindOp<T>().prepare(this).run(fn, conditions, options);

  }


  async save<T>(object: T, options?: IDistributedSaveOptions): Promise<T>;
  async save<T>(object: T[], options?: IDistributedSaveOptions): Promise<T[]>;
  async save<T>(object: T | T[], options: IDistributedSaveOptions = {validate: true}): Promise<T | T[]> {
    return this.factory.createSaveOp<T>().prepare(this).run(object, options);

  }

  remove<T>(object: T): Promise<T>;
  remove<T>(object: T[]): Promise<T[]>;
  remove<T>(cls: ClassType<T>, condition: any): Promise<number>;
  remove<T>(cls: T | T[] | ClassType<T>, condition?: any): Promise<T | T[]> {
    throw new Error('Method not implemented.');
  }

  update<T>(cls: ClassType<T>, condition: any, update: any, options?: IUpdateOptions): Promise<number> {
    throw new Error('Method not implemented.');
  }

  aggregate<T>(baseClass: ClassType<T>, aggregationPipeline: any, options?: IAggregateOptions): Promise<T[]> {
    throw new Error('Method not implemented.');
  }

}
