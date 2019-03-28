import {Inject} from "typedi";
import {System} from "../../libs/system/System";
import {DistributedFindOp} from "./DistributedFindOp";


export class DistributedOperationFactory {

  static NAME:string = 'DistributedOperationFactory';

  @Inject(System.NAME)
  system: System;

  createFindOp<T>():DistributedFindOp<T>{
    return new DistributedFindOp(this.system);
  }
}
