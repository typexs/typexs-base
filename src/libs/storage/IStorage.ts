/**
 * Abstract interface for storage declaration
 */
import {IStorageOptions} from './IStorageOptions';
import {IStorageRef} from './IStorageRef';
import {IRuntimeLoader} from '../core/IRuntimeLoader';

export interface IStorage {

  /**
   * Type of storage
   */
  getType(): string;

  /**
   * method called after construct which can be used for initialisation purpose
   *
   * @param loader
   */
  prepare(loader: IRuntimeLoader): boolean | Promise<boolean>;

  /**
   * create new storage ref for connection to the backend
   */
  create(name: string, options: IStorageOptions): IStorageRef | Promise<IStorageRef>;


  /**
   * Shutdown of framework
   */
  shutdown?(): void;
}
