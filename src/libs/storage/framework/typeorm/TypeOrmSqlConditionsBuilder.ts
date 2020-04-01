import * as _ from 'lodash';
import {NotYetImplementedError} from 'commons-base/browser';
import {RelationMetadataArgs} from 'typeorm/browser/metadata-args/RelationMetadataArgs';
import {IConditionJoin} from '../IConditionJoin';
import {TypeOrmPropertyRef} from './schema/TypeOrmPropertyRef';
import {IClassRef, IEntityRef} from 'commons-schema-api/browser';
import {Brackets, EntityManager, QueryBuilder, SelectQueryBuilder} from 'typeorm';
import {DateUtils} from 'typeorm/util/DateUtils';
import {PAst} from '../../../expressions/ast/PAst';
import {IMangoWalker} from '../../../expressions/IMangoWalker';
import {And} from '../../../expressions/operators/logic/And';
import {Or} from '../../../expressions/operators/logic/Or';
import {AbstractCompare} from '../../../expressions/operators/compare/AbstractCompare';
import {PValue} from '../../../expressions/ast/PValue';
import {StorageRef} from '../../../../libs/storage/StorageRef';
import {AbstractSchemaHandler} from '../../AbstractSchemaHandler';

/**
 * TODO Ugly build style make this better
 */
export class TypeOrmSqlConditionsBuilder<T> implements IMangoWalker {


  constructor(manager: EntityManager | QueryBuilder<any>,
              entityRef: IEntityRef,
              storageRef: StorageRef,
              type: 'update' | 'select' | 'delete',
              alias: string = null) {
    // super(entityRef, alias);
    this.entityRef = entityRef;
    this.alias = alias;
    this.type = type;
    this.baseStorageRef = storageRef;
    this.handler = this.baseStorageRef.getSchemaHandler();
    if (manager instanceof EntityManager) {
      const repo = manager.getRepository(entityRef.getClassRef().getClass());

      if (alias) {
        this.baseQueryBuilder = repo.createQueryBuilder(alias) as QueryBuilder<T>;
      } else {
        this.baseQueryBuilder = repo.createQueryBuilder() as QueryBuilder<T>;
        this.alias = this.baseQueryBuilder.alias;
      }

      switch (type) {
        case 'delete':
          this.baseQueryBuilder = this.baseQueryBuilder.delete();
          break;
        case 'update':
          this.baseQueryBuilder = this.baseQueryBuilder.update();
          break;
      }
    } else {
      this.baseQueryBuilder = manager;
    }
  }


  protected inc = 1;

  baseQueryBuilder: QueryBuilder<T>;

  paramInc: number = 0;

  alias: string;

  entityRef: IEntityRef;

  type: 'update' | 'select' | 'delete' = 'select';

  mode: 'where' | 'having' = 'where';

  baseStorageRef: StorageRef;

  handler: AbstractSchemaHandler;

  protected joins: IConditionJoin[] = [];


  getQueryBuilder(): QueryBuilder<T> {
    return this.baseQueryBuilder;
  }

  setQueryBuilder(qb: QueryBuilder<any>) {
    this.baseQueryBuilder = qb;
  }

  getMode() {
    return this.mode;
  }

  setMode(mode: 'where' | 'having') {
    this.mode = mode;
  }

  lookupKeys(key: string): string {
    switch (this.type) {
      case 'delete':
      case 'update':
        return key;
    }

    if (this.mode === 'having') {
      return key;
    }

    const joins = key.split('.');
    let tmp: IClassRef = this.entityRef.getClassRef();
    let names: string[] = this.alias ? [this.alias] : [];
    let rootAlias = this.alias;
    for (const _join of joins) {
      const prop = tmp.getPropertyRef(_join);
      if (!prop) {
        throw new Error('condition property "' + _join + '" is not definied');
      }

      if (prop.isReference()) {
        const from = tmp;
        tmp = prop.getTargetRef() ? prop.getTargetRef() : null;

        const relation: RelationMetadataArgs = (<TypeOrmPropertyRef>prop).relation;
        const join: IConditionJoin = {
          alias: this.createAlias(tmp),
          table: tmp.storingName,
          condition: null,
          ref: tmp ? prop.getEntityRef() : null
        };

        const conditions: string[] = [];
        if (relation.relationType === 'one-to-many') {
          const targetIdKeyProps = tmp.getPropertyRefs().filter(f => f.isIdentifier());
          const sourceIdKeyProps = from.getPropertyRefs().filter(f => f.isIdentifier());
          if (sourceIdKeyProps.length === 1 && targetIdKeyProps.length === 1) {
            const reverseFieldMatch = relation.inverseSideProperty.toString().match(/\.(\w(\w|\d|_)+)/);
            if (reverseFieldMatch && reverseFieldMatch[1]) {
              const reverseField = reverseFieldMatch[1];
              const sourceIdKey = sourceIdKeyProps[0].name;
              const targetIdKey = reverseField + _.capitalize(targetIdKeyProps[0].name);
              conditions.push([join.alias + '.' + targetIdKey, rootAlias + '.' + sourceIdKey].join(' = '));
            } else {
              throw new NotYetImplementedError();
            }
          } else {
            throw new NotYetImplementedError();
          }
        } else if (relation.relationType === 'many-to-one') {
          const sourceIdKeyProps = from.getPropertyRefs().filter(f => f.isIdentifier());
          const targetIdKeyProps = tmp.getPropertyRefs().filter(f => f.isIdentifier());
          if (targetIdKeyProps.length === 1 && targetIdKeyProps.length === 1) {
            const targetIdKey = targetIdKeyProps[0].name;
            const sourceIdKey = prop.storingName + '' + _.capitalize(sourceIdKeyProps[0].name);
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

        if (this.baseQueryBuilder instanceof SelectQueryBuilder) {
          this.baseQueryBuilder.leftJoin(join.table, join.alias, join.condition);
        }


      } else {
        names.push(prop.name);
      }
    }
    return names.join('.');
  }

  private buildMango(condition: PAst) {
    if (_.isEmpty(condition)) {
      return null;
    }
    const brackets = condition.visit(this);
    return this.asBracket(brackets);
  }


  build(condition: any, k: string = null) {
    if (_.isEmpty(condition)) {
      return null;
    }

    if (condition instanceof PAst) {
      return this.buildMango(condition);
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


  protected createAlias(tmp: IClassRef) {
    let name = _.snakeCase(tmp.storingName);
    name += '_' + (this.inc++);
    return name;
  }


  private _erg(op: string, key: string = null, value: any = null) {
    const _key = this.lookupKeys(key);
    const p = this.paramName();
    return new Brackets(qb => {
      if (this.mode === 'having') {
        (<SelectQueryBuilder<any>>qb).having(`${_key} ${op} :${p}`, this.paramValue(p, value, _key));
      } else {
        qb.where(`${_key} ${op} :${p}`, this.paramValue(p, value, _key));
      }
    });
  }

  private handleOperation(op: string, key: string = null, value: any = null) {
    const handle = this.handler.getOperationHandle(op.toLowerCase());
    const _key = this.lookupKeys(key);
    // const p = this.paramName();
    return new Brackets(qb => {
      const syntax = handle(_key, value);
      if (this.mode === 'having') {
        (<SelectQueryBuilder<any>>qb).having(syntax);
      } else {
        qb.where(syntax);
      }
    });
  }

  private paramName() {
    return 'p' + (this.paramInc++);
  }


  private paramValue(p: string, v: any, columnName?: string) {
    const q = {};

    let ref = this.entityRef;
    if (this.joins.length > 0) {
      ref = _.last(this.joins).ref;
    }

    // TODO make this more flexible
    if (v instanceof Date) {
      if (ref && this.mode === 'where') {
        const _columnName = columnName.split('.').pop();
        const entityMetadata = this.baseQueryBuilder.connection.getMetadata(ref.getClassRef().getClass());
        const columnMetadata = entityMetadata.columns.find(x => x.propertyName === _columnName);
        const driver = this.baseQueryBuilder.connection.driver;
        q[p] = driver.preparePersistentValue(v, columnMetadata);
      } else {
        q[p] = DateUtils.mixedDateToDatetimeString(v);
      }
    } else {
      q[p] = v;
    }
    return q;
  }


  $eq(condition: any, key: string = null, value: any = null) {
    return this._erg('=', key, value);
  }


  $isNull(condition: any, key: string = null, value: any = null) {
    const _key = this.lookupKeys(key);
    return new Brackets(qb => {
      if (this.mode === 'having') {
        (<SelectQueryBuilder<any>>qb).having(`${_key} IS NULL`);
      } else {
        qb.where(`${_key} IS NULL`);
      }
    });
  }

  $isNotNull(condition: any, key: string = null, value: any = null) {
    const _key = this.lookupKeys(key);
    return new Brackets(qb => {
      if (this.mode === 'having') {
        (<SelectQueryBuilder<any>>qb).having(`${_key} IS NOT NULL`);
      } else {
        qb.where(`${_key} IS NOT NULL`);
      }
    });
  }

  $ne(condition: any, key: string = null, value: any = null) {
    return this._erg('<>', key, value);
  }


  $lt(condition: any, key: string = null, value: any = null) {
    return this._erg('<', key, value);
  }

  $lte(condition: any, key: string = null, value: any = null) {
    return this.$le(condition, key, value);
  }

  $le(condition: any, key: string = null, value: any = null) {
    return this._erg('<=', key, value);
  }

  $gt(condition: any, key: string = null, value: any = null) {
    return this._erg('>', key, value);
  }

  $gte(condition: any, key: string = null, value: any = null) {
    return this.$ge(condition, key, value);
  }

  $ge(condition: any, key: string = null, value: any = null) {
    return this._erg('>=', key, value);
  }

  $like(condition: any, key: string = null, value: any = null) {
    return this._erg('LIKE', key, value.replace(/%/g, '%%').replace(/\*/g, '%'));
  }

// TODO
  $regex(condition: any, key: string = null, value: any = null) {
    return this.handleOperation('regex', key, value);
  }



  $in(condition: any, key: string = null, value: any = null) {
    const _key = this.lookupKeys(key);
    const p = this.paramName();
    return new Brackets(qb => {
      if (this.mode === 'having') {
        (<SelectQueryBuilder<any>>qb).having(`${_key} IN (:...${p})`, this.paramValue(p, value));
      } else {
        qb.where(`${_key} IN (:...${p})`, this.paramValue(p, value));
      }
    });
  }

  $nin(condition: any, key: string = null, value: any = null) {
    const _key = this.lookupKeys(key);
    const p = this.paramName();
    return new Brackets(qb => {
      if (this.mode === 'having') {
        (<SelectQueryBuilder<any>>qb).having(`${_key} NOT IN (:...${p})`, this.paramValue(p, value));
      } else {
        qb.where(`${_key} NOT IN (:...${p})`, this.paramValue(p, value));
      }
    });
  }

  // TODO
  $not(condition: any, key: string = null, value: any = null) {
    // return this.handleOperation('regex', key, value);
  }

  $and(condition: any, key: string = null) {
    return new Brackets(qb => {
      _.map(condition['$and'], c => {
        if (this.mode === 'having') {
          return (<SelectQueryBuilder<any>>qb).andHaving(this.build(c, null));
        } else {
          return qb.andWhere(this.build(c, null));
        }
      });
    });
  }


  $or(condition: any, key: string = null) {
    return new Brackets(qb => {
      _.map(condition['$or'], c => {
        if (this.mode === 'having') {
          return (<SelectQueryBuilder<any>>qb).orHaving(this.build(c, null));
        } else {
          return qb.orWhere(this.build(c, null));
        }
      });
    });
  }

  visitArray(ast: PAst): any[] {
    return [];
  }

  leaveArray(brackets: any[], ast: PAst) {
    return brackets;

  }

  visitObject(ast: PAst) {
    return {};
  }

  leaveObject(res: any, ast: PAst) {
    // return _.values(res);
    return this.asBracket(_.values(res));
  }


  onValue(ast: PAst): any {
    if (ast instanceof PValue) {
      return ast.value;
    }
    return null;
  }


  onOperator(ast: PAst, valueRes: any): any {
    if (ast instanceof AbstractCompare) {
      const method = '$' + ast.name;
      if (this[method]) {
        return this[method](null, ast.key, valueRes);
      }
    }
    return null;
  }

  visitOperator(ast: PAst): any {
    return {};
  }

  leaveOperator(res: any, ast: PAst) {
    if (ast instanceof And) {
      return new Brackets(qb => {
        _.map(res, c => {
          if (this.mode === 'having') {
            return (<SelectQueryBuilder<any>>qb).andHaving(c);
          } else {
            return qb.andWhere(c);
          }
        });
      });
    } else if (ast instanceof Or) {
      return new Brackets(qb => {
        _.map(res, c => {
          if (this.mode === 'having') {
            return (<SelectQueryBuilder<any>>qb).orHaving(c);
          } else {
            return qb.orWhere(c);
          }
        });
      });
    }
    return res;
  }


  asBracket(brackets: any) {
    if (_.isArray(brackets)) {
      if (brackets.length === 1) {
        return _.first(brackets);
      } else if (brackets.length > 1) {
        return new Brackets(qb => {
          _.map(brackets, c => {
            if (this.mode === 'having') {
              return (<SelectQueryBuilder<any>>qb).andHaving(c);
            } else {
              return qb.andWhere(c);
            }
          });
        });
      }
    }
    return brackets;

  }
}
