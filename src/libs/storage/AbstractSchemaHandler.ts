import * as _ from 'lodash';
import {StorageRef} from './StorageRef';
import {IDBType} from './IDBType';
import {JS_DATA_TYPES} from 'commons-schema-api/browser';
import {ICollection} from './ICollection';
import {ICollectionProperty} from './ICollectionProperty';


export abstract class AbstractSchemaHandler {

  readonly type: string;

  readonly storageRef: StorageRef;

  constructor(ref?: StorageRef) {
    this.storageRef = ref;
  }

  abstract getCollectionNames(): Promise<string[]>;

  async getCollection(name: string): Promise<any> {
    const c = await this.storageRef.connect();
    return await c.manager.connection.createQueryRunner().getTable(name);
  }

  async getCollections(names: string[]): Promise<ICollection[]> {
    const c = await this.storageRef.connect();
    const collections = await c.manager.connection.createQueryRunner().getTables(names);
    const colls: ICollection[] = [];
    _.map(collections, c => {
      const props: ICollectionProperty[] = [];
      c.columns.map(c => {
        props.push(c);
      });

      const _c: ICollection = {
        name: c.name,
        framework: 'typeorm',
        properties: props
      };

      _.keys(c).filter(x => x !== 'columns').map(k => {
        _c[k] = c[k];
      });

      colls.push(_c);
    });
    return colls;
  }


  translateToJsType(dbType: string): JS_DATA_TYPES {
    let type: JS_DATA_TYPES = null;
    switch (dbType) {
      case 'int':
      case 'tinyint':
      case 'smallint':
      case 'mediumint':
      case 'bigint':
        type = 'number';
        break;
      case 'double':
      case 'float':
      case 'decimal':
        type = 'double';
        break;
      case 'boolean':
        type = 'boolean';
        break;
      case 'json':
        type = 'json';
        break;
      case 'datetime':
        type = 'datetime';
        break;
      case 'timestamp':
        type = 'datetime';
        break;
      case 'date':
        type = 'date';
        break;
      case 'time':
        type = 'time';
        break;
      case 'varchar':
      case 'char':
      case 'tinytext':
      case 'text':
      case 'mediumtext':
      case 'longtext':
      default:
        type = 'string';
    }
    return type;
  }

  translateToStorageType(jsType: string, length: number = null): IDBType {
    const type: IDBType = {
      type: null,
      variant: null,
      sourceType: null,
      length: length
    };

    const split = jsType.split(':');
    type.sourceType = <JS_DATA_TYPES>split.shift();
    if (split.length > 0) {
      type.variant = split.shift();
    }

    switch (type.sourceType) {
      case 'string':
        type.type = 'text';
        break;
      case 'text':
        type.type = 'text';
        break;
      case 'boolean':
        type.type = 'int';
        break;
      case 'number':
        type.type = 'int';
        break;
      case 'double':
        type.type = 'numeric';
        break;
      case 'time':
        type.type = 'datetime';
        break;
      case 'date':
        type.type = 'datetime';
        break;
      case 'datetime':
        type.type = 'datetime';
        break;
      case 'timestamp':
        type.type = 'datetime';
        break;
      case 'json':
        type.type = 'text';
        break;

    }
    return type;
  }

}
