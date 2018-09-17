import {IStorageOptions} from "./IStorageOptions";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {StorageRef} from "./StorageRef";
import * as _ from "lodash";

import {AbstractSchemaHandler} from "./AbstractSchemaHandler";
import {RuntimeLoader} from "../../base/RuntimeLoader";
import {K_CLS_STORAGE_SCHEMAHANDLER} from "../../types";


export const DEFAULT_STORAGE_OPTIONS: IStorageOptions = <SqliteConnectionOptions>{
  name: 'default',
  type: "sqlite",
  database: ":memory:"
};


export class Storage {

  static NAME: string = 'Storage';

  nodeId: string;

  private refs: { [key: string]: StorageRef } = {};

  private schemaHandler: { [key: string]: Function } = {};


  register(name: string, options: IStorageOptions) {
    // Todo load other handling class from baseClass if necassary options.baseClass
    let ref = new StorageRef(options);
    let type = '__default__';
    if (_.has(this.schemaHandler, options.type)) {
      type = options.type;
    }
    ref.setSchemaHandler(Reflect.construct(this.schemaHandler[type], [ref]));
    this.refs[name] = ref;
    return ref;
  }


  async prepare(loader: RuntimeLoader) {
    let classes = await loader.getClasses(K_CLS_STORAGE_SCHEMAHANDLER);
    for (let cls of classes) {
      let obj = <AbstractSchemaHandler>Reflect.construct(cls, []);
      this.schemaHandler[obj.type] = cls;
    }
  }


  get(name: string = 'default'): StorageRef {
    return this.refs[name];
  }


  getNames() {
    return _.keys(this.refs);
  }


  getAllOptions() {
    return _.values(this.refs).map(ref => ref.getOptions())
  }

}


