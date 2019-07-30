import {Inject} from 'typedi';
import {System} from '../../libs/system/System';
import {DistributedFindOp} from './DistributedFindOp';
import {DistributedSaveOp} from './DistributedSaveOp';


export class DistributedOperationFactory {

  static NAME = 'DistributedOperationFactory';

  @Inject(System.NAME)
  system: System;

  createFindOp<T>(): DistributedFindOp<T> {
    return new DistributedFindOp(this.system);
  }

  createSaveOp<T>(): DistributedSaveOp<T> {
    return new DistributedSaveOp(this.system);
  }
}
