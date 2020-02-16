import {StorageRef} from './StorageRef';
import {ISaveOptions} from './framework/ISaveOptions';
import {IFindOptions} from './framework/IFindOptions';
import {SaveOp} from './framework/typeorm/SaveOp';
import {FindOp} from './framework/typeorm/FindOp';
import {DeleteOp} from './framework/typeorm/DeleteOp';
import {Invoker} from '../../base/Invoker';
import {Container} from 'typedi';
import {ConnectionWrapper} from './ConnectionWrapper';
import {IEntityController} from './IEntityController';
import {ClassType} from 'commons-schema-api';

/**
 * TODO Should be renamed to StorageEntityManager
 *
 * TODO also an interface for EntityManager should be implemented
 */
export class StorageEntityController implements IEntityController {

  // revision support
  readonly storageRef: StorageRef;

  readonly invoker: Invoker;

  private timeout: NodeJS.Timeout;

  connection: ConnectionWrapper;

  constructor(ref: StorageRef) {
    this.storageRef = ref;
    this.invoker = Container.get(Invoker.NAME);
  }

  async connect() {
    if (this.connection) {
      if (!this.connection.isOpened()) {
        await this.connection.close();
        this.connection = await this.storageRef.connect();
      } else {
        this.connection.usageInc();
      }
    } else {
      this.connection = await this.storageRef.connect();
    }
    return this.connection;
  }

  async close() {
    if (this.connection) {
      this.connection.usageDec();
      if (this.connection.getUsage() <= 0) {
        await this.connection.close();
        this.connection = null;
      }
    }
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

  update<T>(cls: ClassType<T>, condition: any, update: any): Promise<T[]> {
    throw new Error('Method not implemented.');
  }

  aggregate<T>(baseClass: ClassType<T>, ...pipeline: any[]): Promise<T[]> {
    throw new Error('Method not implemented.');
  }

}
