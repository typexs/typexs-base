import {Container, Inject, Service} from "typedi";
import {IFindOptions, Invoker, System} from "../..";
import {DistributedFindOp} from "./DistributedFindOp";


@Service()
export class DistributedOperationFactory {

  @Inject(System.NAME)
  system: System;

  createFindOp<T>():DistributedFindOp<T>{
    return new DistributedFindOp(this.system);
  }
}
