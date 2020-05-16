import {IStorageOptions} from './IStorageOptions';
import {IStorageRef} from './IStorageRef';
import {IEntityController} from './IEntityController';
import {ClassType, IClassRef} from 'commons-schema-api';
import {IConnection} from './IConnection';

export abstract class StorageRef implements IStorageRef {


  private options: IStorageOptions = null;

  private _extending: IStorageRef[] = [];

  private _extends: IStorageRef[] = [];

  constructor(options: IStorageOptions) {
    this.options = options;
  }

  get name() {
    return this.options.name;
  }

  abstract hasEntityClass(cls: string | Function | IClassRef): boolean;

  abstract addEntityClass(type: Function | IClassRef | ClassType<any>, options?: any): void;

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
