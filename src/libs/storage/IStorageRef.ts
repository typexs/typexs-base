import {IEntityController} from './IEntityController';
import {IStorageOptions} from './IStorageOptions';
import {ClassType, IClassRef, IEntityRef} from 'commons-schema-api/browser';
import {IConnection} from './IConnection';
import {ICollection} from './ICollection';

/**
 * Abstract interface for storage declaration
 */
export interface IStorageRef {

  /**
   * returns the name
   */
  getName(): string;

  /**
   * return storage options
   */
  getFramework(): string;

  /**
   * return storage options
   */
  getType(): string;

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

  /**
   * Returns IEntityRef handled by the storage
   *
   * @param name
   */
  getEntityRef(name: string | Function): IEntityRef;

  /**
   * Return all handled entities
   */
  getEntityRefs(): IEntityRef[];

  /**
   * Return all handled entity ames
   */
  getEntityNames(): string[];

  /**
   * Return all collection names handled by this storage ref
   */
  getRawCollectionNames(): string[] | Promise<string[]>;

  /**
   * Return all collection descriptions handled by this storage ref
   */
  getRawCollections(collectionNames: string[]): ICollection[] | Promise<ICollection[]>;

  /**
   * Return a collection description handled by this storage ref by name
   */
  getRawCollection(name: string): ICollection | Promise<ICollection>;

}