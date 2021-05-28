import {TypeOrmEntityRef} from './schema/TypeOrmEntityRef';
import {ColumnType, QueryBuilder} from 'typeorm';
import * as _ from 'lodash';
import {TypeOrmEntityRegistry} from './schema/TypeOrmEntityRegistry';
import {JS_DATA_TYPES} from '@allgemein/schema-api';


export class TypeOrmUtils {

  /**
   * Return object class for primative string representation
   * @param name
   */
  static getJsObjectType(name: string) {
    if (['string', 'number', 'boolean', 'date', 'float', 'array', 'object'].includes(name.toLowerCase())) {
      switch (name.toLowerCase()) {
        case 'string':
          return String;
        case 'number':
          return Number;
        case 'boolean':
          return Boolean;
        case 'date':
          return Date;
        case 'float':
          return Number;
        case 'array':
          return Array;
        case 'object':
          return Object;
      }


    }
    return null;
  }

  static aliasKey(qb: QueryBuilder<any>, k: string, sep: string = '.') {
    const keyIsAlias = qb.expressionMap.selects.find(x => x.aliasName === k);
    if (keyIsAlias) {
      return qb.escape(k);
    }
    const keyIsSelect = qb.expressionMap.selects.find(x => _.last(x.selection.split('.')) === k);
    if (keyIsSelect) {
      return keyIsSelect.selection;
    }

    const kSplit = k.split(sep).map(x => x.replace(/^\"+|\"+$|^\'+|\'+$/g, '').trim());
    if (kSplit.length === 1) {
      kSplit.unshift(qb.alias);
    } else if (kSplit.length === 0) {
      throw new Error('key not found: ' + k + ' [' + JSON.stringify(kSplit) + ']');
    } else if (kSplit[0] !== qb.alias) {
      throw new Error('key not the same: ' + k + ' [' + JSON.stringify(kSplit) + ']');
    }
    return kSplit.map(x => qb.escape(x)).join(sep);
  }

  static resolveName(instance: any): string {
    const xsdef: TypeOrmEntityRef = TypeOrmEntityRegistry.$().getEntityRefFor(instance);
    if (xsdef) {
      return xsdef.name;
    } else {
      throw new Error('resolveName not found for instance: ' + JSON.stringify(instance));
    }
  }

  static resolveByEntityRef<T>(objs: T[]) {
    const resolved: { [entityType: string]: T[] } = {};
    for (const obj of objs) {
      const entityName = this.resolveName(obj);
      if (!resolved[entityName]) {
        resolved[entityName] = [];
      }
      resolved[entityName].push(obj);

    }
    return resolved;
  }

  static toJsonType(type: ColumnType): JS_DATA_TYPES {
    switch (type) {
      case 'timetz':

      case 'smalldatetime':
      case 'datetime':
      case 'datetime2':
      case 'datetimeoffset':
        return 'datetime';

      case 'date':
        return 'date';

      case 'timestamptz':
      case 'timestamp':
      case 'timestamp without time zone':
      case 'timestamp with time zone':
      case 'timestamp with local time zone':
        return 'timestamp';


      case 'character varying':
      case 'varying character':
      case 'nvarchar':
      case 'national varchar':
      case  'native character' :
      case  'char' :
      case  'nchar' :
      case  'national char' :
      case  'nvarchar2' :
      case 'time':
      case 'time with time zone':
      case 'time without time zone':
      case 'character':
      case 'varchar':
      case 'varchar2':
      case 'mediumtext':
      case 'text':
      case 'string':
      case 'longblob':
      case 'longtext':
      case 'tinyblob':
      case 'tinytext':
      case 'mediumblob':
      case 'blob':
      case 'ntext':
      case 'citext':
        return 'string';

      case 'bit':
      case 'boolean':
      case 'bool':
        return 'boolean';

      case 'simple-array':
      case 'hstore':
      case 'bytea':
      case 'long':
      case 'long raw':
      case 'bfile':
      case 'clob':
      case 'nclob':
      case 'image':
      case 'interval year to month':
      case 'interval day to second':
      case 'interval':
      case 'line':
      case 'lseg':
      case 'box':
      case 'circle':
      case 'path':
      case 'polygon':
      case 'linestring':
      case 'multipoint':
      case 'multilinestring':
      case 'multipolygon':
      case 'geometrycollection':
      case 'int4range':
      case 'int8range':
      case 'numrange':
      case 'tsrange':
      case 'tstzrange':
      case 'daterange':
      case 'enum':
      case 'cidr':
      case 'inet':
      case 'macaddr':
      case 'bit varying':
      case 'varbit':
      case 'tsvector':
      case 'tsquery':
      case 'uuid':
      case 'xml':
      case 'hierarchyid':
      case 'sql_variant':
      case 'rowid':
      case 'urowid':
      case 'uniqueidentifier':
      case 'rowversion':
      case  'raw' :
      case  'binary' :
      case  'varbinary':
        return 'byte';

      case 'simple-json':
      case 'json':
      case 'jsonb':
        return 'json';

      case 'float':
      case 'double':
      case 'real':
      case 'double precision':
      case 'float4':
      case 'float8':
      case 'smallmoney':
      case 'money':
      case 'geometry':
      case 'geography':
      case 'dec':
      case 'decimal':
      case 'numeric':
      case 'number':
      case 'fixed':
        return 'double';

      case 'year':
      case 'point':
      case 'unsigned big int':
      case 'int':
      case 'int2':
      case 'int4':
      case 'int8':
      case 'integer':
      case 'tinyint':
      case 'smallint':
      case 'mediumint':
      case 'bigint':
        return 'number';
    }

    return null;
  }
}
