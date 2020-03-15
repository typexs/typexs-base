import {IFindOp} from '../libs/storage/framework/IFindOp';
import {IUpdateOp} from '../libs/storage/framework/IUpdateOp';
import {ISaveOp} from '../libs/storage/framework/ISaveOp';
import {IDeleteOp} from '../libs/storage/framework/IDeleteOp';
import {IAggregateOp} from '../libs/storage/framework/IAggregateOp';


export interface IStorageApi {

  doBeforeFind<T>(op: IFindOp<T>): void;

  doAfterFind<T>(results: T[], error: Error, op: IFindOp<T>): void;

  doBeforeUpdate<T>(op: IUpdateOp<T>): void;

  doAfterUpdate<T>(results: number, error: Error, op: IUpdateOp<T>): void;

  doBeforeSave<T>(object: T[] | T, op: ISaveOp<T>): void;

  doAfterSave<T>(object: T[] | T, error: Error, op: ISaveOp<T>): void;

  doBeforeRemove<T>(op: IDeleteOp<T>): void;

  doAfterRemove<T>(results: number | T[], error: Error, op: IDeleteOp<T>): void;

  doBeforeAggregate<T>(op: IAggregateOp): void;

  doAfterAggregate<T>(results: T[], error: Error, op: IAggregateOp): void;


}
