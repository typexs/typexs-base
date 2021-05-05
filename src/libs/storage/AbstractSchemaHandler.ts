import * as _ from 'lodash';
import {IDBType} from './IDBType';
import {JS_DATA_TYPES} from '@allgemein/schema-api';
import {ICollection} from './ICollection';
import {ICollectionProperty} from './ICollectionProperty';
import {NotSupportedError} from '@allgemein/base';
import {TypeOrmStorageRef} from './framework/typeorm/TypeOrmStorageRef';
import {Config} from '@allgemein/config';


export abstract class AbstractSchemaHandler {

  constructor(ref?: TypeOrmStorageRef) {
    this.storageRef = ref;
  }

  static types: string[] = [];


  static operations: { [type: string]: { [op: string]: (...args: any[]) => string } } = {};

  static values: { [type: string]: { [op: string]: (...args: any[]) => string } } = {};

  static typeMap: { [type: string]: { [type: string]: string } } = {};


  readonly type: string;

  readonly storageRef: TypeOrmStorageRef;


  /**
   * Returns false if db type doesn't supports json type for columns
   */
  supportsJson() {
    return false;
  }

  /**
   * Return if null first or null last extra support during sort
   */
  supportsSortNull() {
    return false;
  }


  prepare() {
    if (!AbstractSchemaHandler.types.includes(this.type)) {
      AbstractSchemaHandler.types.push(this.type);
      this.initOnceByType();
    }
  }


  initOnceByType() {
    const typeMap = Config.get('schemaHandler.' + this.type + '.typeMap', {});
    if (!AbstractSchemaHandler.typeMap[this.type]) {
      AbstractSchemaHandler.typeMap[this.type] = {};
    }
    _.keys(typeMap).map(k => {
      AbstractSchemaHandler.typeMap[this.type][k] = typeMap[k];
    });


    const fn = {
      eq: (k: string, v: any) => k + ' = ' + v,
      ne: (k: string, v: any) => k + ' <> ' + v,
      lt: (k: string, v: any) => k + ' < ' + v,
      lte: (k: string, v: any) => k + ' <= ' + v,
      le: (k: string, v: any) => k + ' <= ' + v,
      gt: (k: string, v: any) => k + ' > ' + v,
      gte: (k: string, v: any) => k + ' >= ' + v,
      ge: (k: string, v: any) => k + ' >= ' + v,
      like: (k: string, v: any) => k + ' LIKE ' + v.replace(/%/g, '%%').replace(/\*/g, '%'),
      not: (v: any) => 'NOT ' + v,
      isNull: (k: string) => k + ' IS NULL',
      isNotNull: (k: string) => k + ' IS NOT NULL',
      regex: (k: string, field: string | RegExp) => {
        throw new NotSupportedError('regex operation not supported');
      },
      in: (k: string, v: string | any[]) => {
        if (_.isArray(v)) {
          return k + ' IN (' + v.join(', ') + ')';
        } else {
          return k + ' IN (' + v + ')';
        }
      },
      nin: (k: string, v: string | any[]) => {
        if (_.isArray(v)) {
          return k + ' NOT IN (' + v.join(', ') + ')';
        } else {
          return k + ' NOT IN (' + v + ')';
        }
      },
      year: (field: string) => 'YEAR(' + field + ')',
      month: (field: string) => 'MONTH(' + field + ')',
      day: (field: string) => 'DAY(' + field + ')',
      sum: (field: string) => 'SUM(' + field + ')',
      count: (field: string) => 'COUNT(' + field + ')',
      min: (field: string) => 'MIN(' + field + ')',
      max: (field: string) => 'MAX(' + field + ')',
      avg: (field: string) => 'AVG(' + field + ')',
      date: (field: string) => 'DATE(' + field + ')',
      timestamp: (field: string) => 'TIMESTAMP(' + field + ')',
      add: (fieldsValues: string[]) => fieldsValues.join(' + '),
      subtract: (fieldsValues: string[]) => fieldsValues.join(' - '),
      multiply: (fieldsValues: string[]) => fieldsValues.join(' * '),
      divide: (fieldsValues: string[]) => fieldsValues.join(' / '),
      dateToString: (field: string, format: string, timezone: any, onNull: any) => {
        throw new NotSupportedError('dateToString operation not supported');
      },
    };

    _.keys(fn).forEach(x => {
      this.registerOperationHandle(x, fn[x]);
    });

    this.registerValueHandle('like', (x: string) => x.replace(/%/g, '%%').replace(/\*/g, '%'));
  }


  abstract getCollectionNames(): Promise<string[]>;


  async getCollection(name: string): Promise<any> {
    const c = await this.storageRef.connect();
    return await c.manager.connection.createQueryRunner().getTable(name);
  }


  escape(name: string, quote: boolean = true) {
    if (_.isString(name)) {
      if (quote) {
        return '\'' + name.replace(/'/, '\'\'') + '\'';
      } else {
        return name.replace(/'/, '\'\'');
      }
    }
    return name;

  }


  async getCollections(names: string[]): Promise<ICollection[]> {
    const c = await this.storageRef.connect();
    const collections = await c.manager.connection.createQueryRunner().getTables(names);
    const colls: ICollection[] = [];
    _.map(collections, c => {
      const props: ICollectionProperty[] = [];
      c.columns.map((c: any) => {
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

  getTypeMap() {
    return _.get(AbstractSchemaHandler.typeMap, this.type, {});
  }

  translateToStorageType(jsType: string, length: number = null): IDBType {
    const type: IDBType = {
      type: null,
      variant: null,
      sourceType: null,
      length: length
    };

    const split = jsType.split(':');
    type.sourceType = <JS_DATA_TYPES | 'array'>split.shift();
    if (split.length > 0) {
      type.variant = split.shift();
    }


    const mapType = this.getTypeMap()[type.sourceType];
    if (!!mapType) {
      type.type = mapType;
    } else {
      switch (type.sourceType) {
        case 'string':
          type.type = 'varchar';
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
          type.type = 'json';
          break;
        case 'object':
          type.type = 'object';
          break;
        case 'array':
          type.type = 'array';
          break;

      }
    }

    return type;
  }


  registerOperationHandle(name: string, op: (...args: any[]) => string) {
    if (!AbstractSchemaHandler.operations[this.type]) {
      AbstractSchemaHandler.operations[this.type] = {};
    }
    AbstractSchemaHandler.operations[this.type][name.toLowerCase()] = op;
  }

  registerValueHandle(name: string, op: (...args: any[]) => string) {
    if (!AbstractSchemaHandler.values[this.type]) {
      AbstractSchemaHandler.values[this.type] = {};
    }
    AbstractSchemaHandler.values[this.type][name.toLowerCase()] = op;
  }

  getOperationHandle(name: string): (...args: any[]) => string {
    if (AbstractSchemaHandler.operations[this.type][name.toLowerCase()]) {
      return AbstractSchemaHandler.operations[this.type][name.toLowerCase()];
    } else {
      throw new NotSupportedError('sql operation not defined ' + name.toLowerCase());
    }
  }


  getValueHandle(name: string): (...args: any[]) => string {
    if (AbstractSchemaHandler.values[this.type][name.toLowerCase()]) {
      return AbstractSchemaHandler.values[this.type][name.toLowerCase()];
    } else {
      return (x: any) => x;
    }
  }
}
