import {IDeleteOp} from "../IDeleteOp";
import {StorageEntityController} from "../../StorageEntityController";
import {NotYetImplementedError} from "commons-base";


export class DeleteOp<T>  implements IDeleteOp<T> {
  readonly controller: StorageEntityController;

  constructor(controller: StorageEntityController) {
    this.controller = controller;
  }

  run(object: T[] | T): Promise<T[] | T> {
    throw new NotYetImplementedError();
  }

}
