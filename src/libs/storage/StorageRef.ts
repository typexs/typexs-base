import {IStorageOptions} from './IStorageOptions';
import {IStorageRef} from './IStorageRef';
import {IEntityController} from './IEntityController';
import {ClassType, IClassRef, IEntityRef} from 'commons-schema-api/browser';
import {IConnection} from './IConnection';
import {ICollection} from './ICollection';
import {EventEmitter} from 'events';

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

  abstract getEntityRef(name: string | Function): IEntityRef;

  abstract getEntityRefs(): IEntityRef[];

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


  abstract prepare(): boolean | Promise<boolean>;


  getExtendingStorageRef(): IStorageRef[] {
    return this._extending;
  }


  getExtendedStorageRef(): IStorageRef[] {
    return this._extends;
  }

  abstract connect(): Promise<IConnection>;


}
