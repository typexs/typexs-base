import {IStorageOptions} from './IStorageOptions';
import {IStorageRef} from './IStorageRef';
import {IEntityController} from './IEntityController';
import {ClassType, IClassRef, IEntityRef, ILookupRegistry, ISchemaRef} from '@allgemein/schema-api';
import {IConnection} from './IConnection';
import {ICollection} from './ICollection';
import {EventEmitter} from 'events';
import {isArray, uniqBy} from 'lodash';

export abstract class StorageRef extends EventEmitter implements IStorageRef {


  private options: IStorageOptions = null;

  private _extending: IStorageRef[] = [];

  private _extends: IStorageRef[] = [];

  constructor(options: IStorageOptions) {
    super();
    this.setMaxListeners(10000);
    this.options = options;
  }

  get name() {
    return this.options.name;
  }

  getName() {
    return this.options.name;
  }

  abstract reload(): Promise<boolean> | boolean;

  abstract isActive(): boolean;

  abstract getType(): string;

  abstract getFramework(): string;

  abstract hasEntityClass(cls: string | Function | IClassRef): boolean;

  abstract addEntityClass(type: Function | IClassRef | ClassType<any>, options?: any): void;

  abstract getRegistry(): ILookupRegistry;

  abstract getEntityRef(name: string | Function): IEntityRef;

  abstract getEntityRefs(): IEntityRef[];

  /**
   * Impl. of IStorageRef interface method
   */
  getDeclaredEntities(): Function[] {
    return this.getOptions().entities;
  }

  getSchemaRef(name: string): ISchemaRef {
    return this.getSchemaRefs().find(x => x.name === name);
  }

  getSchemaRefs(): ISchemaRef[] {
    // TODO impl caching
    try {
      const schemas = [].concat(...this.getEntityRefs().map(x => x.getSchemaRefs()).map(x => isArray(x) ? x : [x]));
      return uniqBy(schemas, (x: ISchemaRef) => x.name);
    } catch (e) {
      return [];
    }

  }

  abstract getEntityNames(): string[];

  abstract getRawCollectionNames(): string[] | Promise<string[]>;

  abstract getRawCollections(collectionNames: string[]): ICollection[] | Promise<ICollection[]>;

  abstract getRawCollection(name: string): ICollection | Promise<ICollection>;

  abstract shutdown(full?: boolean): void;

  addExtendedStorageRef(ref: IStorageRef) {
    this._extends.push(ref);
  }

  addExtendingStorageRef(extRef: IStorageRef) {
    this._extending.push(extRef);
  }

  abstract getController(): IEntityController;


  getOptions() {
    return this.options;
  }


  setOptions(options: IStorageOptions) {
    this.options = options;
  }


  /**
   * implements initialisation for storage ref, called after constructor
   */
  abstract initialize?(): boolean | Promise<boolean>;

  abstract prepare(): boolean | Promise<boolean>;


  getExtendingStorageRef(): IStorageRef[] {
    return this._extending;
  }


  getExtendedStorageRef(): IStorageRef[] {
    return this._extends;
  }

  abstract connect(): Promise<IConnection>;


}
