import * as _ from 'lodash';
import {Inject} from 'typedi';
import {DistributedOperationFactory} from './DistributedOperationFactory';
import {IDistributedFindOptions} from './find/IDistributedFindOptions';
import {IDistributedSaveOptions} from './save/IDistributedSaveOptions';
import {IEntityController} from '../storage/IEntityController';
import {ClassType, IEntityRef} from '@allgemein/schema-api';
import {NotSupportedError} from '@allgemein/base';
import {IDistributedRemoveOptions} from './remove/IDistributedRemoveOptions';
import {IDistributedUpdateOptions} from './update/IDistributedUpdateOptions';
import {IDistributedAggregateOptions} from './aggregate/IDistributedAggregateOptions';
import {__NODE_ID__} from '../Constants';


export class DistributedStorageEntityController implements IEntityController {

  @Inject()
  factory: DistributedOperationFactory;

  name(): string {
    return 'distributed_storage_controller';
  }

  forClass(cls: ClassType<any> | string | Function): IEntityRef {
    throw new NotSupportedError('method not supported for this type of controller');
  }


  async findOne<T>(fn: ClassType<T> | Function | string,
                   conditions: any = null,
                   options: IDistributedFindOptions = {limit: 1}): Promise<T> {
    options = _.assign(options || {}, {limit: 1});
    return this.find<T>(fn, conditions, options).then(r => {
      if (r.length === 0) {
        return null;
      }

      if (options.hint) {
        r = _.filter(r, x => x[__NODE_ID__] === options.hint);
      }
      return r.length > 0 ? r.shift() : null;
    });
  }


  async find<T>(fn: ClassType<T> | Function | string,
                conditions: any = null,
                options: IDistributedFindOptions = {limit: 100}): Promise<T[]> {
    return this.factory.createFindOp<T>().prepare(this).run(fn, conditions, options);
  }


  async save<T>(object: T, options?: IDistributedSaveOptions): Promise<T>;
  async save<T>(object: T[], options?: IDistributedSaveOptions): Promise<T[]>;
  async save<T>(object: T | T[], options: IDistributedSaveOptions = {validate: true}): Promise<T | T[]> {
    return this.factory.createSaveOp<T>().prepare(this).run(object, options);

  }

  remove<T>(object: T, options?: IDistributedRemoveOptions): Promise<T>;
  remove<T>(object: T[], options?: IDistributedRemoveOptions): Promise<T[]>;
  remove<T>(cls: ClassType<T>, condition: any, options?: IDistributedRemoveOptions): Promise<number>;
  remove<T>(cls: T | T[] | ClassType<T>, condition?: any, options?: IDistributedRemoveOptions): Promise<number | T | T[]> {
    return this.factory.createRemoveOp<T>().prepare(this).run(cls, condition, options);
  }

  update<T>(cls: ClassType<T>, condition: any, update: any, options?: IDistributedUpdateOptions): Promise<number> {
    return this.factory.createUpdateOp<T>().prepare(this).run(cls, condition, update, options);
  }

  aggregate<T>(baseClass: ClassType<T>, aggregationPipeline: any, options?: IDistributedAggregateOptions): Promise<T[]> {
    return this.factory.createAggregateOp<T>().prepare(this).run(baseClass, aggregationPipeline, options);
  }

}
