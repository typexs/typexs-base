import {IEntityController} from './IEntityController';
import {IStorageOptions} from './IStorageOptions';
import {ClassType, IClassRef} from 'commons-schema-api';
import {IConnection} from './IConnection';

/**
 * Abstract interface for storage declaration
 */
export interface IStorageRef {

  /**
   * Return generic entity controller
   */
  getController(): IEntityController;

  /**
   * return storage options
   */
  getOptions(): IStorageOptions;

  /**
   * implements initialisation for storage ref, called after constructor
   */
  prepare(): boolean | Promise<boolean>;


  /**
   * check if class is handled by this storage ref
   *
   * @param cls
   */
  hasEntityClass(cls: Function | string | IClassRef): boolean;


  /**
   * add a new class to schema
   *
   * @param type
   */
  addEntityClass(type: Function | IClassRef | ClassType<any>, options?: any): void;

  /**
   * Open a direct connection
   */
  connect(): Promise<IConnection>;


  /**
   * shutdown function to finalize this storage ref (close opened connection and release resources)
   *
   * @param full - marks if shutdown is soft (close on runtime) or hard (shutdown of program)
   */
  shutdown(full?: boolean): void;


  /**
   * add storage ref which is extended by this
   *
   * @param ref
   */
  addExtendedStorageRef(ref: IStorageRef): void;

  /**
   * add storage ref which extending an other
   *
   * @param ref
   */
  addExtendingStorageRef(extRef: IStorageRef): void;
}
