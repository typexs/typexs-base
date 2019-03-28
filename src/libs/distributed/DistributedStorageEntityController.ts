import {Inject} from "typedi";
import {IFindOptions} from "../..";
import {DistributedOperationFactory} from "./DistributedOperationFactory";


export class DistributedStorageEntityController {

  @Inject(type => DistributedOperationFactory)
  factory: DistributedOperationFactory;

  /*
    async save<T>(object: T, options?: ISaveOptions): Promise<T>;
    async save<T>(object: T[], options?: ISaveOptions): Promise<T[]>;
    async save<T>(object: T | T[], options: ISaveOptions = {validate: true}): Promise<T | T[]> {
      return new SaveOp<T>(this).run(object, options);
    }
  */

  async findOne<T>(fn: Function | string, conditions: any = null, options: IFindOptions = {limit: 1}): Promise<T> {
    return this.find<T>(fn, conditions, options).then(r => r.shift());
  }


  async find<T>(fn: Function | string, conditions: any = null, options: IFindOptions = {limit: 100}): Promise<T[]> {
    return this.factory.createFindOp<T>().prepare(this).run(fn, conditions, options);

  }

  /*

    async remove<T>(object: T): Promise<T>;
    async remove<T>(object: T[]): Promise<T[]>;
    async remove<T>(object: T | T[]): Promise<T | T[]> {
      return new DeleteOp<T>(this).run(object);

    }
  */
}
