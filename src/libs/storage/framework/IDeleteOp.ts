export interface IDeleteOp<T> {
  run(object: T | T[]): Promise<T | T[]>;

}
