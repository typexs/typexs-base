import {IStorageApi} from './IStorageApi';
import {ClassType} from '@allgemein/schema-api';
import {IFindOptions} from '../libs/storage/framework/IFindOptions';
import {IUpdateOptions} from '../libs/storage/framework/IUpdateOptions';
import {ISaveOptions} from '../libs/storage/framework/ISaveOptions';
import {IFindOp} from '../libs/storage/framework/IFindOp';
import {IUpdateOp} from '../libs/storage/framework/IUpdateOp';
import {IDeleteOp} from '../libs/storage/framework/IDeleteOp';
import {IAggregateOp} from '../libs/storage/framework/IAggregateOp';
import {ISaveOp} from '../libs/storage/framework/ISaveOp';


export class StorageApi implements IStorageApi {

  doBeforeFind<T>(op: IFindOp<T>) {
  }

  doAfterFind<T>(results: T[], error: Error, op: IFindOp<T>) {
  }

  doBeforeUpdate<T>(op: IUpdateOp<T>) {
  }

  doAfterUpdate<T>(results: number, error: Error, op: IUpdateOp<T>) {
  }

  doBeforeSave<T>(object: T[] | T, op: ISaveOp<T>) {
  }

  doAfterSave<T>(object: T[] | T, error: Error, op: ISaveOp<T>) {
  }

  doBeforeRemove<T>(op: IDeleteOp<T>) {
  }

  doAfterRemove<T>(results: number | T[], error: Error, op: IDeleteOp<T>) {
  }


  doBeforeAggregate<T>(op: IAggregateOp) {
  }

  doAfterAggregate<T>(results: T[], error: Error, op: IAggregateOp) {
  }

}
