import {IStorageOptions} from "./IStorageOptions";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {StorageRef} from "./StorageRef";
import * as _ from "lodash";

import {AbstractSchemaHandler} from "./AbstractSchemaHandler";
import {RuntimeLoader} from "../../base/RuntimeLoader";
import {K_CLS_STORAGE_SCHEMAHANDLER} from "../Constants";
import {DefaultSchemaHandler} from "../../adapters/storage/DefaultSchemaHandler";
import {IClassRef} from "commons-schema-api";


export const DEFAULT_STORAGE_OPTIONS: IStorageOptions = <SqliteConnectionOptions & IStorageOptions>{
  name: 'default',
  type: "sqlite",
  database: ":memory:",
  connectOnStartup: false
};


export class Storage {

  static NAME: string = 'Storage';

  nodeId: string;

  private refs: { [key: string]: StorageRef } = {};

  private schemaHandler: { [key: string]: Function } = {};

  constructor() {
    this.schemaHandler['__default__'] = DefaultSchemaHandler;
  }


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
      if (obj) {
        this.schemaHandler[obj.type] = cls;
      }
    }
  }


  /**
   * Returns storage ref for the given classRef or machineName
   * @param classRef
   */
  forClass(classRef: IClassRef | string) {
    for (let k in this.refs) {
      if (this.refs[k].hasEntityClass(classRef)) {
        return this.refs[k]
      }
    }
    return null;
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


