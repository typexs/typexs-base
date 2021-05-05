import * as _ from 'lodash';
import {NotYetImplementedError} from '@allgemein/base';
import {RelationMetadataArgs} from 'typeorm/metadata-args/RelationMetadataArgs';
import {IConditionJoin} from '../IConditionJoin';
import {TypeOrmPropertyRef} from './schema/TypeOrmPropertyRef';
import {IClassRef, IEntityRef} from '@allgemein/schema-api';
import {EntityManager, QueryBuilder, SelectQueryBuilder} from 'typeorm';
import {DateUtils} from 'typeorm/util/DateUtils';
import {AbstractSchemaHandler} from '../../AbstractSchemaHandler';
import {
  AbstractCompare,
  And,
  IMangoWalker,
  MangoExpression,
  MultiArgs,
  Not,
  Or,
  PAst,
  PValue
} from '@allgemein/mango-expressions';
import {TypeOrmStorageRef} from './TypeOrmStorageRef';


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


  protected inc = 1;

  baseQueryBuilder: QueryBuilder<T>;

  paramInc: number = 0;

  alias: string;

  entityRef: IEntityRef;

  type: 'update' | 'select' | 'delete' = 'select';

  mode: 'where' | 'having' = 'where';

  baseStorageRef: TypeOrmStorageRef;

  handler: AbstractSchemaHandler;

  protected joins: IConditionJoin[] = [];


  constructor(manager: EntityManager | QueryBuilder<any>,
              entityRef: IEntityRef,
              storageRef: TypeOrmStorageRef,
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
      this.alias = this.baseQueryBuilder.alias;
    }
  }


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

        const join: IConditionJoin = {
          alias: this.createAlias(tmp),
          table: tmp.storingName,
          condition: null,
          ref: tmp ? prop.getClassRef().getEntityRef() : null
        };

        const conditions: string[] = [];

        const relation: RelationMetadataArgs = (<TypeOrmPropertyRef>prop).relation;
        if (relation) {
          if (relation.relationType === 'one-to-many' || relation.relationType === 'one-to-one') {
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
          } else if (relation.relationType === 'many-to-one' || relation.relationType === 'many-to-many') {
            const sourceIdKeyProps = from.getPropertyRefs().filter(f => f.isIdentifier());
            const targetIdKeyProps = tmp.getPropertyRefs().filter(f => f.isIdentifier());
            if (sourceIdKeyProps.length === 1 && targetIdKeyProps.length === 1) {
              const targetIdKey = targetIdKeyProps[0].name;
              const sourceIdKey = prop.storingName + '' + _.capitalize(sourceIdKeyProps[0].name);
              conditions.push([join.alias + '.' + targetIdKey, rootAlias + '.' + sourceIdKey].join(' = '));
            } else {
              throw new NotYetImplementedError();
            }

          } else {
            throw new NotYetImplementedError();
          }
        } else {
          throw new NotYetImplementedError('relation is not given');
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


  private handleOperation(op: string, key: string = null, value: any = null) {
    const handle = this.handler.getOperationHandle(op.toLowerCase());
    const vhandle = this.handler.getValueHandle(op.toLowerCase());
    const _key = this.lookupKeys(key);
    if (!_.isUndefined(value)) {
      const p = this.paramName();
      if (_.isArray(value)) {
        return {
          q: handle(_key, ':...' + p), // `${_key} ${op} (:...${p})`,
          p: this.paramValue(p, value, _key, vhandle)
        };
      } else if (value instanceof MultiArgs) {
        const paramNames = value.args.map(x => this.paramName());
        const p = {};
        for (let i = 0; i < value.args.length; i++) {
          _.assign(p, this.paramValue(paramNames[i], value.args[i], _key, vhandle));
        }
        return {
          q: handle(_key, ...paramNames.map(x => ':' + x)),
          p: p
        };
      } else {
        return {
          q: handle(_key, ':' + p),
          p: this.paramValue(p, value, _key, vhandle)
        };
      }
    } else {
      return {
        q: handle(_key)
      };
    }
    return null;
  }


  private paramName() {
    return 'p' + (this.paramInc++);
  }


  private paramValue(p: string, v: any, columnName?: string, vHandle?: (x: any) => any) {
    const q = {};


    // TODO make this more flexible
    if (v instanceof Date) {
      let ref = this.entityRef;
      if (this.joins.length > 0) {
        ref = _.last(this.joins).ref;
      }
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
      q[p] = vHandle ? vHandle(v) : v;
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
      return this.handleOperation(ast.name, ast.key as string, valueRes);
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


}
