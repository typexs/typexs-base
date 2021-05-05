import {AbstractSchemaHandler} from '../../../libs/storage/AbstractSchemaHandler';
import * as _ from 'lodash';
import {MysqlConnectionOptions} from 'typeorm/driver/mysql/MysqlConnectionOptions';
import {IDBType} from '../../../libs/storage/IDBType';
import {JS_DATA_TYPES} from '@allgemein/schema-api';
import {NotYetImplementedError} from '@allgemein/base';


export class MysqlSchemaHandler extends AbstractSchemaHandler {

  type: string = 'mysql';

  initOnceByType() {
    super.initOnceByType();

    const fn = {
      regex: (k: string, field: string | RegExp, options: string) => {
        if (_.isString(field)) {
          return k + ' REGEXP ' + field;
        } else if (_.isRegExp(field)) {
          return k + ' REGEXP ' + field.source;
        } else {
          throw new NotYetImplementedError('regex for ' + k + ' with value ' + field);
        }

      },
      date: (field: string) => 'DATE_FORMAT(' + field + ',\'%Y-%m-%d\')',
      dateToString:
        (field: string, format: string = '%Y-%m-%d %H:%M:%S' /* +, timezone: any, onNull: any */) =>
          'strftime(\'' + format + '\', ' + field + ')',
    };

    _.keys(fn).forEach(x => {
      this.registerOperationHandle(x, fn[x]);
    });

  }


  async getCollectionNames(): Promise<string[]> {
    const c = await this.storageRef.connect();
    const database = (<MysqlConnectionOptions>this.storageRef.getOptions()).database;
    const q = await c.manager.query('SELECT table_name FROM information_schema.tables WHERE table_schema=\'' + database + '\';');
    return _.map(q, x => x.table_name);
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
        if (type.length && type.length > 0) {
          type.type = 'varchar';
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
        if (type.variant) {
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
