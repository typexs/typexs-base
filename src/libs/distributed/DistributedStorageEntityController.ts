import {Inject} from 'typedi';
import {DistributedOperationFactory} from './DistributedOperationFactory';
import {IDistributedFindOptions} from './IDistributedFindOptions';
import {IDistributedSaveOptions} from './IDistributedSaveOptions';


export class DistributedStorageEntityController {

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


  /*

    async remove<T>(object: T): Promise<T>;
    async remove<T>(object: T[]): Promise<T[]>;
    async remove<T>(object: T | T[]): Promise<T | T[]> {
      return new DeleteOp<T>(this).run(object);

    }
  */
}
