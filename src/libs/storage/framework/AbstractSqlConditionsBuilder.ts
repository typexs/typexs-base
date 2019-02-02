import * as _ from 'lodash';
import {NotYetImplementedError} from "commons-base/browser";
import {IEntityRef, IClassRef} from "commons-schema-api/browser";
import {IConditionJoin} from "./IConditionJoin";


export abstract class AbstractSqlConditionsBuilder {

  protected inc: number = 1;

  protected entityDef: IEntityRef;

  protected alias: string;

  protected joins: IConditionJoin[] = [];

  constructor(entityDef: IEntityRef, alias: string = null) {
    this.inc = 1;
    this.entityDef = entityDef;
    this.alias = alias ? alias : this.entityDef.storingName;
  }


  getJoins() {
    return this.joins;
  }


  protected createAlias(tmp: IClassRef) {
    let name = _.snakeCase(tmp.storingName);
    name += '_' + (this.inc++);
    return name;
  }


  abstract lookupKeys(key: string): string;

  build(condition: any, k: string = null): string {

    if (_.isEmpty(condition)) {
      return null;
    }
    let control: any = _.keys(condition).filter(k => k.startsWith('$'));
    if (!_.isEmpty(control)) {
      control = control.shift();
      if (this[control]) {
        return this[control](condition, k, condition[control]);
      } else {
        throw new NotYetImplementedError()
      }
    } else if (_.isArray(condition)) {
      return this.$or({'$or': condition}, k);
    } else {
      return _.keys(condition).map(k => {
        if (_.isPlainObject(condition[k])) {
          return this.build(condition[k], k);
        }
        let key = this.lookupKeys(k);
        let value = condition[k];
        if (_.isString(value) || _.isNumber(value) || _.isDate(value)) {
          return `${key} = '${value}'`
        } else {
          throw new Error(`SQL.build not a plain type ${key} = ${JSON.stringify(value)} (${typeof value})`);
          //return null;
        }

      }).filter(c => !_.isNull(c)).join(' AND ');
    }
  }

  escape(str: any) {
    if (_.isString(str)) {
      str = str.replace(/'/g, "\\'");
    }
    return str;
  }

  $eq(condition: any, key: string = null, value: any = null) {
    let _key = this.lookupKeys(key);
    return `${_key} = '${this.escape(value)}'`
  }

  $ne(condition: any, key: string = null, value: any = null) {
    let _key = this.lookupKeys(key);
    return `${_key} <> '${this.escape(value)}'`
  }

  $lt(condition: any, key: string = null, value: any = null) {
    let _key = this.lookupKeys(key);
    return `${_key} < ${this.escape(value)}`
  }

  $le(condition: any, key: string = null, value: any = null) {
    let _key = this.lookupKeys(key);
    return `${_key} <= ${this.escape(value)}`
  }

  $gt(condition: any, key: string = null, value: any = null) {
    let _key = this.lookupKeys(key);
    return `${_key} > ${this.escape(value)}`
  }

  $ge(condition: any, key: string = null, value: any = null) {
    let _key = this.lookupKeys(key);
    return `${_key} >= ${this.escape(value)}`
  }

  $like(condition: any, key: string = null, value: any = null) {
    let _key = this.lookupKeys(key);
    return `${_key} LIKE '${this.escape(value).replace(/%/g, '%%').replace(/\*/g, '%')}'`
  }

  $in(condition: any, key: string = null, value: any = null) {
    let _key = this.lookupKeys(key);
    return `${_key} IN (${value.map((x: any) => this.escape(x)).join(',')})`
  }

  $and(condition: any, key: string = null): string {
    return '(' + _.map(condition['$and'], c => this.build(c, null)).join(') AND (') + ')';
  }

  $or(condition: any, key: string = null): string {
    return '(' + _.map(condition['$or'], c => this.build(c, null)).join(') OR (') + ')';
  }

}
