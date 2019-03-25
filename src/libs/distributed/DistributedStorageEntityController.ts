import {Container} from "typedi";
import {IFindOptions, Invoker} from "../..";
import {DistributedFindOp} from "./DistributedFindOp";


export class DistributedStorageEntityController {


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
    return (<DistributedFindOp<T>>Container.get(DistributedFindOp).prepare(this)).run(fn, conditions, options);

  }

  /*

    async remove<T>(object: T): Promise<T>;
    async remove<T>(object: T[]): Promise<T[]>;
    async remove<T>(object: T | T[]): Promise<T | T[]> {
      return new DeleteOp<T>(this).run(object);

    }
  */
}
