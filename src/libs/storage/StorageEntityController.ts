import {StorageRef} from "./StorageRef";
import {ISaveOptions} from "./framework/ISaveOptions";
import {IFindOptions} from "./framework/IFindOptions";
import {SaveOp} from "./framework/typeorm/SaveOp";
import {FindOp} from "./framework/typeorm/FindOp";
import {DeleteOp} from "./framework/typeorm/DeleteOp";
import {Invoker} from "../..";
import {Container} from "typedi";


export class StorageEntityController {

  // revision support
  readonly storageRef: StorageRef;

  readonly invoker: Invoker;


  constructor(ref: StorageRef) {
    this.storageRef = ref;
    this.invoker = Container.get(Invoker.NAME);
  }


  async save<T>(object: T, options?: ISaveOptions): Promise<T>;
  async save<T>(object: T[], options?: ISaveOptions): Promise<T[]>;
  async save<T>(object: T | T[], options: ISaveOptions = {validate: true}): Promise<T | T[]> {
    return new SaveOp<T>(this).run(object, options);
  }


  async findOne<T>(fn: Function | string, conditions: any = null, options: IFindOptions = {limit: 1}): Promise<T> {
    return this.find<T>(fn, conditions, options).then(r => r.shift());
  }


  async find<T>(fn: Function | string, conditions: any = null, options: IFindOptions = {limit: 100}): Promise<T[]> {
    return new FindOp<T>(this).run(fn, conditions, options);

  }


  async remove<T>(object: T): Promise<T>;
  async remove<T>(object: T[]): Promise<T[]>;
  async remove<T>(object: T | T[]): Promise<T | T[]> {
    return new DeleteOp<T>(this).run(object);

  }

}
