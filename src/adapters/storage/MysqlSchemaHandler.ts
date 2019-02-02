import {AbstractSchemaHandler} from "../../libs/storage/AbstractSchemaHandler";
import * as _ from "lodash";
import {MysqlConnectionOptions} from "typeorm/driver/mysql/MysqlConnectionOptions";
import {IDBType} from "../../libs/storage/IDBType";
import {JS_DATA_TYPES} from "commons-schema-api/browser";


export class MysqlSchemaHandler extends AbstractSchemaHandler {

  type: string = 'mysql';

  async getCollectionNames(): Promise<string[]> {
    let c = await this.storageRef.connect();
    let database = (<MysqlConnectionOptions>this.storageRef.getOptions()).database;
    let q = await c.manager.query('SELECT table_name FROM information_schema.tables WHERE table_schema=\'' + database + '\';');
    return _.map(q, x => x.table_name);
  }


  translateToStorageType(jsType: string, length: number = null): IDBType {
    let type: IDBType = {
      type: null,
      variant: null,
      sourceType: null,
      length: length
    };

    let split = jsType.split(':');
    type.sourceType = <JS_DATA_TYPES>split.shift();
    if (split.length > 0) {
      type.variant = split.shift();
    }

    switch (type.sourceType) {
      case 'string':
        type.type = 'text';
        if (type.length && type.length > 0) {
          type.type = 'varchar'
        }
        break;
      case 'text':
        type.type = 'text';
        break;
      case 'boolean':
        type.type = 'boolean';
        break;
      case 'number':
        type.type = 'int';
        break;
      case 'double':
        type.type = 'double';
        break;
      case 'time':
        type.type = 'time';
        break;
      case 'date':
        type.type = 'date';
        if(type.variant){
          type.type = 'datetime';
        }
        break;
      case 'datetime':
        type.type = 'datetime';
        break;
      case 'timestamp':
        type.type = 'timestamp';
        break;
      case 'json':
        type.type = 'json';
        break;

    }
    return type;
  }


}
