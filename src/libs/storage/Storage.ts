import {IStorageOptions} from "./IStorageOptions";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {StorageRef} from "./StorageRef";


export const DEFAULT_STORAGE_OPTIONS: IStorageOptions = <SqliteConnectionOptions>{
  name: 'default',
  type: "sqlite",
  database: ":memory:"
};


export class Storage {

  nodeId:string;

  private refs: { [key: string]: StorageRef } = {};


  register(name: string, options: IStorageOptions) {
    // Todo load other handling class from baseClass if nesaccary options.baseClass
    let ref = new StorageRef(options);
    this.refs[name] = ref;
    return ref;
  }


  get(name: string = 'default'): StorageRef {
    return this.refs[name];
  }

}


