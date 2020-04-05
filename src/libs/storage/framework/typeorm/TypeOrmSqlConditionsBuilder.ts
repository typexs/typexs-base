import * as _ from 'lodash';
import {NotYetImplementedError} from 'commons-base/browser';
import {RelationMetadataArgs} from 'typeorm/browser/metadata-args/RelationMetadataArgs';
import {IConditionJoin} from '../IConditionJoin';
import {TypeOrmPropertyRef} from './schema/TypeOrmPropertyRef';
import {IClassRef, IEntityRef} from 'commons-schema-api/browser';
import {EntityManager, QueryBuilder, SelectQueryBuilder} from 'typeorm';
import {DateUtils} from 'typeorm/util/DateUtils';
import {PAst} from '../../../expressions/ast/PAst';
import {IMangoWalker} from '../../../expressions/IMangoWalker';
import {And} from '../../../expressions/operators/logic/And';
import {Or} from '../../../expressions/operators/logic/Or';
import {AbstractCompare} from '../../../expressions/operators/compare/AbstractCompare';
import {PValue} from '../../../expressions/ast/PValue';
import {StorageRef} from '../../../../libs/storage/StorageRef';
import {AbstractSchemaHandler} from '../../AbstractSchemaHandler';
import {Not} from '../../../expressions/operators/logic/Not';
import {MangoExpression} from '../../../expressions/MangoExpression';


export interface ISqlParam {
  /**
   * sql query
   */
  q: string;

  /**
   * parameters
   */
  p?: any;
}

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


  private buildMango(condition: PAst, apply: boolean = true): ISqlParam {
    if (_.isEmpty(condition)) {
      return null;
    }
    let brackets = condition.visit(this);

    if (_.isArray(brackets)) {
      if (brackets.length > 1) {
        brackets = this.buildQueryObject(brackets, 'AND');
      } else {
        brackets = brackets.shift();
      }
    }

    if (_.isEmpty(brackets)) {
      return null;
    }

    if (apply) {
      const qb = (<SelectQueryBuilder<any>>this.baseQueryBuilder);
      if (this.mode === 'having') {
        qb.having(brackets.q, brackets.p);
      } else {
        qb.where(brackets.q, brackets.p);
      }
    }
    return brackets;
  }


  build(condition: any, k: string = null): ISqlParam {
    if (_.isEmpty(condition)) {
      return null;
    }

    if (!(condition instanceof PAst)) {
      condition = new MangoExpression(condition).getRoot();
    }

    return this.buildMango(condition);
  }


  protected createAlias(tmp: IClassRef) {
    let name = _.snakeCase(tmp.storingName);
    name += '_' + (this.inc++);
    return name;
  }


  private _erg2(op: string, key: string = null, value?: any): ISqlParam {
    const _key = this.lookupKeys(key);
    if (!_.isUndefined(value)) {
      const p = this.paramName();
      if (_.isArray(value)) {
        return {
          q: `${_key} ${op} (:...${p})`,
          p: this.paramValue(p, value, _key)
        };
      } else {
        return {
          q: `${_key} ${op} :${p}`,
          p: this.paramValue(p, value, _key)
        };
      }
    } else {
      return {
        q: `${_key} ${op}`
      };
    }
  }


  private handleOperation(op: string, key: string = null, value: any = null) {
    const handle = this.handler.getOperationHandle(op.toLowerCase());
    const _key = this.lookupKeys(key);
    return handle(_key, value);
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
    return this.buildQueryObject(_.values(res), 'AND');
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
    if (ast instanceof And || ast instanceof Or) {
      const op = ast.name.toUpperCase();
      return this.buildQueryObject(res, op);
    } else if (ast instanceof Not) {
      res.q = 'NOT (' + res.q + ')';
    }
    return res;
  }


  private buildQueryObject(res: ISqlParam[], op: string): ISqlParam {
    const param = {};
    const parts: string[] = [];
    res.map((x: any) => {
      parts.push(x.q);
      if (x.p) {
        _.assign(param, x.p);
      }
    });
    if (parts.length > 1) {
      return {
        q: '(' + parts.join(') ' + op + ' (') + ')',
        p: param
      };
    }
    return {
      q: parts.shift(),
      p: param
    };
  }


  $eq(condition: any, key: string = null, value: any = null) {
    return this._erg2('=', key, value);
  }


  $isNull(condition: any, key: string = null, value: any = null) {
    return this._erg2('IS NULL', key);
  }


  $isNotNull(condition: any, key: string = null, value: any = null) {
    return this._erg2('IS NOT NULL', key);
  }


  $ne(condition: any, key: string = null, value: any = null) {
    return this._erg2('<>', key, value);
  }


  $lt(condition: any, key: string = null, value: any = null) {
    return this._erg2('<', key, value);
  }


  $lte(condition: any, key: string = null, value: any = null) {
    return this.$le(condition, key, value);
  }


  $le(condition: any, key: string = null, value: any = null) {
    return this._erg2('<=', key, value);
  }


  $gt(condition: any, key: string = null, value: any = null) {
    return this._erg2('>', key, value);
  }


  $gte(condition: any, key: string = null, value: any = null) {
    return this.$ge(condition, key, value);
  }


  $ge(condition: any, key: string = null, value: any = null) {
    return this._erg2('>=', key, value);
  }


  $like(condition: any, key: string = null, value: any = null) {
    return this._erg2('LIKE', key, value.replace(/%/g, '%%').replace(/\*/g, '%'));
  }

  $regex(condition: any, key: string = null, value: any = null) {
    return this.handleOperation('regex', key, value);
  }


  $in(condition: any, key: string = null, value: any = null) {
    return this._erg2('IN', key, value);
  }


  $nin(condition: any, key: string = null, value: any = null) {
    return this._erg2('NOT IN', key, value);
  }


  // TODO
  $not(condition: any, key: string = null, value: any = null) {
    return this._erg2('NOT', key, value);
  }


}
