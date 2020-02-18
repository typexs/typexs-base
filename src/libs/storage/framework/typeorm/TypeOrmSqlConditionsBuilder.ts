import * as _ from 'lodash';
import {NotYetImplementedError} from 'commons-base/browser';
import {RelationMetadataArgs} from 'typeorm/browser/metadata-args/RelationMetadataArgs';
import {IConditionJoin} from '../IConditionJoin';
import {TypeOrmPropertyRef} from './schema/TypeOrmPropertyRef';
import {IClassRef, IEntityRef} from 'commons-schema-api/browser';
import {Brackets, EntityManager, SelectQueryBuilder} from 'typeorm';


export class TypeOrmSqlConditionsBuilder<T> /*extends AbstractSqlConditionsBuilder*/ {

  protected inc = 1;

  baseQueryBuilder: SelectQueryBuilder<T>;

  paramInc: number = 0;

  alias: string;

  entityRef: IEntityRef;


  protected joins: IConditionJoin[] = [];


  constructor(manager: EntityManager, entityRef: IEntityRef, alias: string = null) {
    // super(entityRef, alias);
    this.entityRef = entityRef;
    this.alias = alias;
    const repo = manager
      .getRepository(entityRef.getClassRef().getClass());
    if (alias) {
      this.baseQueryBuilder = repo.createQueryBuilder(alias) as SelectQueryBuilder<T>;
    } else {
      this.baseQueryBuilder = repo.createQueryBuilder() as SelectQueryBuilder<T>;
      this.alias = this.baseQueryBuilder.alias;
    }
  }


  getQueryBuilder(): SelectQueryBuilder<T> {
    return this.baseQueryBuilder;
  }

  lookupKeys(key: string): string {
    const joins = key.split('.');
    let tmp: IClassRef = this.entityRef.getClassRef();
    let names: string[] = this.alias ?  [this.alias] : [];
    let rootAlias = this.alias;
    for (const _join of joins) {
      const prop = tmp.getPropertyRef(_join);
      if (prop.isReference()) {
        const from = tmp;
        tmp = prop.getTargetRef() ? prop.getTargetRef() : null;

        const relation: RelationMetadataArgs = (<TypeOrmPropertyRef>prop).relation;
        const join: IConditionJoin = {
          alias: this.createAlias(tmp),
          table: tmp.storingName,
          condition: null
        };

        const conditions: string[] = [];
        if (relation.relationType === 'one-to-many') {
          const sourceIdKeyProps = from.getPropertyRefs().filter(f => f.isIdentifier());
          if (sourceIdKeyProps.length === 1) {
            const sourceIdKey = sourceIdKeyProps[0].name;
            const targetIdKey = from.storingName + '' + _.capitalize(sourceIdKey);
            conditions.push([join.alias + '.' + targetIdKey, rootAlias + '.' + sourceIdKey].join(' = '));
          } else {
            throw new NotYetImplementedError();
          }
        } else if (relation.relationType === 'many-to-one') {
          const targetIdKeyProps = tmp.getPropertyRefs().filter(f => f.isIdentifier());
          if (targetIdKeyProps.length === 1) {
            const targetIdKey = targetIdKeyProps[0].name;
            const sourceIdKey = tmp.storingName + '' + _.capitalize(targetIdKey);
            conditions.push([join.alias + '.' + targetIdKey, rootAlias + '.' + sourceIdKey].join(' = '));
          } else {
            throw new NotYetImplementedError();
          }

        } else {
          throw new NotYetImplementedError();
        }

        join.condition = conditions.join(' AND ');
        this.joins.push(join);

        rootAlias = join.alias;
        names = [rootAlias];

        this.baseQueryBuilder.leftJoin(join.table, join.alias, join.condition);

      } else {
        names.push(prop.name);
      }
    }
    return names.join('.');
  }


  build(condition: any, k: string = null) {
    if (_.isEmpty(condition)) {
      return null;
    }
    // tslint:disable-next-line:no-shadowed-variable
    let control: any = _.keys(condition).filter(k => k.startsWith('$'));
    if (!_.isEmpty(control)) {
      control = control.shift();
      if (this[control]) {
        return this[control](condition, k, condition[control]);
      } else {
        throw new NotYetImplementedError();
      }
    } else if (_.isArray(condition)) {
      return this.$or({'$or': condition}, k);
    } else {
      // tslint:disable-next-line:no-shadowed-variable
      const brackets = _.keys(condition)
        .map(k => {
          if (_.isPlainObject(condition[k])) {
            return this.build(condition[k], k);
          }
          // const key = this.lookupKeys(k);
          const value = condition[k];
          if (_.isString(value) || _.isNumber(value) || _.isDate(value) || _.isBoolean(value) || _.isNull(value)) {
            return this.$eq('$eq', k, value);
          } else {
            throw new Error(`SQL.build not a plain type ${k} = ${JSON.stringify(value)} (${typeof value})`);
            // return null;
          }

        })
        .filter(c => !_.isNull(c)) as Brackets[];

      if (brackets.length > 1) {
        return new Brackets(qb => {
          brackets.map(x => qb.andWhere(x as Brackets));
        });
      } else {
        return brackets.shift();
      }

    }
  }

  //
  // escape(str: any) {
  //   if (_.isNull(str)) {
  //     return 'NULL';
  //   }
  //   if (_.isBoolean(str)) {
  //     return str ? 'TRUE' : 'FALSE';
  //   }
  //   str = this.addSlashes(str);
  //   if (_.isString(str)) {
  //     str = `'${str}'`;
  //   }
  //   return str;
  // }
  //
  // addSlashes(str: any) {
  //   if (_.isString(str)) {
  //     str = str.replace(/'/g, '\\\'');
  //   }
  //   return str;
  // }

  protected createAlias(tmp: IClassRef) {
    let name = _.snakeCase(tmp.storingName);
    name += '_' + (this.inc++);
    return name;
  }

  private _erg(op: string, condition: any, key: string = null, value: any = null) {
    const _key = this.lookupKeys(key);
    const p = this.paramName();
    return new Brackets(qb => {
      qb.where(`${_key} ${op} :${p}`, this.paramValue(p, value));
    });
  }

  private paramName() {
    return 'p' + (this.paramInc++);
  }

  private paramValue(p: string, v: any) {
    const q = {};
    q[p] = v;
    return q;
  }

  $eq(condition: any, key: string = null, value: any = null) {
    return this._erg('=', condition, key, value);
  }


  $isNull(condition: any, key: string = null, value: any = null) {
    const _key = this.lookupKeys(key);
    return new Brackets(qb => {
      qb.where(`${_key} IS NULL`);
    });
  }

  $isNotNull(condition: any, key: string = null, value: any = null) {
    const _key = this.lookupKeys(key);
    return new Brackets(qb => {
      qb.where(`${_key} IS NOT NULL`);
    });
  }

  $ne(condition: any, key: string = null, value: any = null) {
    return this._erg('<>', condition, key, value);
  }


  $lt(condition: any, key: string = null, value: any = null) {
    return this._erg('<', condition, key, value);
  }

  $lte(condition: any, key: string = null, value: any = null) {
    return this.$le(condition, key, value);
  }

  $le(condition: any, key: string = null, value: any = null) {
    return this._erg('<=', condition, key, value);
  }

  $gt(condition: any, key: string = null, value: any = null) {
    return this._erg('>', condition, key, value);
  }

  $gte(condition: any, key: string = null, value: any = null) {
    return this.$ge(condition, key, value);
  }

  $ge(condition: any, key: string = null, value: any = null) {
    return this._erg('>=', condition, key, value);
  }

  $like(condition: any, key: string = null, value: any = null) {
    return this._erg('LIKE', condition, key, value.replace(/%/g, '%%').replace(/\*/g, '%'));
  }

  $in(condition: any, key: string = null, value: any = null) {
    const _key = this.lookupKeys(key);
    const p = this.paramName();
    return new Brackets(qb => {
      qb.where(`${_key} IN (:...${p})`, this.paramValue(p, value));
    });
  }

  $and(condition: any, key: string = null) {
    return new Brackets(qb => {
      _.map(condition['$and'], c => qb.andWhere(this.build(c, null)));
    });
    // return '(' + ).join(') AND (') + ')';
  }

  $or(condition: any, key: string = null) {
    return new Brackets(qb => {
      _.map(condition['$or'], c => qb.orWhere(this.build(c, null)));
    });
    // return '(' + _.map(condition['$or'], c => this.build(c, null)).join(') OR (') + ')';
  }


}
