/**
 * TODO Should be renamed to StorageEntityManager
 *
 * TODO also an interface for EntityManager should be implemented
 */
import {IEntityController} from '../../IEntityController';
import {TypeOrmStorageRef} from './TypeOrmStorageRef';
import {Invoker} from '../../../../base/Invoker';
import {TypeOrmConnectionWrapper} from './TypeOrmConnectionWrapper';
import {Injector} from '../../../di/Injector';
import {ClassType, IClassRef, IEntityRef} from '@allgemein/schema-api';
import {IFindOptions} from '../IFindOptions';
import {FindOp} from './FindOp';
import {ISaveOptions} from '../ISaveOptions';
import {SaveOp} from './SaveOp';
import {DeleteOp} from './DeleteOp';
import {UpdateOp} from './UpdateOp';
import {IUpdateOptions} from '../IUpdateOptions';
import {IDeleteOptions} from '../IDeleteOptions';
import {IAggregateOptions} from '../IAggregateOptions';
import {AggregateOp} from './AggregateOp';

export class TypeOrmEntityController implements IEntityController {

  // revision support
  readonly storageRef: TypeOrmStorageRef;

  readonly invoker: Invoker;

  connection: TypeOrmConnectionWrapper;

  constructor(ref: TypeOrmStorageRef) {
    this.storageRef = ref;
    this.invoker = Injector.get(Invoker.NAME);
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

  /**
   * Returns the reference to handled storage
   */
  getStorageRef() {
    return this.storageRef;
  }

  name() {
    return this.storageRef.name;
  }

  forClass(cls: ClassType<any> | string | Function | IClassRef): IEntityRef {
    if (this.storageRef.hasEntityClass(cls)) {
      return this.storageRef.getEntityRef(cls as any);
    }
    return null;
  }

  async findOne<T>(fn: Function | string | ClassType<T>, conditions: any = null, options: IFindOptions = {limit: 1}): Promise<T> {
    return this.find<T>(fn, conditions, options).then(r => r.length > 0 ? r.shift() : null);
  }

  async find<T>(fn: Function | string | ClassType<T>, conditions: any = null, options: IFindOptions = {limit: 100}): Promise<T[]> {
    return new FindOp<T>(this).run(fn, conditions, options);

  }

  async save<T>(object: T, options?: ISaveOptions): Promise<T>;
  async save<T>(object: T[], options?: ISaveOptions): Promise<T[]>;
  async save<T>(object: T | T[], options: ISaveOptions = {validate: true}): Promise<T | T[]> {
    return new SaveOp<T>(this).run(object, options);
  }


  async remove<T>(object: T | T[], options?: IDeleteOptions): Promise<number>;
  async remove<T>(object: ClassType<T>, condition: any, options?: IDeleteOptions): Promise<number>;
  async remove<T>(object: T | T[] | ClassType<T>, condition?: any, options?: IDeleteOptions): Promise<number> {
    return new DeleteOp<T>(this).run(object, condition, options);

  }

  update<T>(cls: ClassType<T>, condition: any, update: any, options: IUpdateOptions = {}): Promise<number> {
    return new UpdateOp<T>(this).run(cls, condition, update, options);
  }

  aggregate<T>(cls: ClassType<T>, pipeline: any[], options: IAggregateOptions = {}): Promise<any[]> {
    return new AggregateOp<T>(this).run(cls, pipeline, options);
  }

}
