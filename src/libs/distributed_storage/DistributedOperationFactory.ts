import {Inject} from 'typedi';
import {System} from '../../libs/system/System';
import {DistributedFindOp} from './find/DistributedFindOp';
import {DistributedSaveOp} from './save/DistributedSaveOp';
import {EntityControllerRegistry} from '../storage/EntityControllerRegistry';
import {DistributedUpdateOp} from './update/DistributedUpdateOp';
import {DistributedRemoveOp} from './remove/DistributedRemoveOp';
import {DistributedAggregateOp} from './aggregate/DistributedAggregateOp';


export class DistributedOperationFactory {

  static NAME = 'DistributedOperationFactory';

  @Inject(System.NAME)
  system: System;

  @Inject(EntityControllerRegistry.NAME)
  entityControllerRegistry: EntityControllerRegistry;

  createFindOp<T>(): DistributedFindOp<T> {
    return new DistributedFindOp(this.system, this.entityControllerRegistry);
  }

  createSaveOp<T>(): DistributedSaveOp<T> {
    return new DistributedSaveOp(this.system, this.entityControllerRegistry);
  }

  createUpdateOp<T>(): DistributedUpdateOp<T> {
    return new DistributedUpdateOp(this.system, this.entityControllerRegistry);
  }

  createRemoveOp<T>(): DistributedRemoveOp<T> {
    return new DistributedRemoveOp(this.system, this.entityControllerRegistry);
  }

  createAggregateOp<T>(): DistributedAggregateOp {
    return new DistributedAggregateOp(this.system, this.entityControllerRegistry);
  }

}
