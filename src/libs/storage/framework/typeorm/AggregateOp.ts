import {ClassType, IEntityRef} from '@allgemein/schema-api';
import {TypeOrmEntityRegistry} from './schema/TypeOrmEntityRegistry';
import {NotSupportedError, TreeUtils} from '@allgemein/base';
import * as _ from 'lodash';
import {IAggregateOp} from '../IAggregateOp';
import {IAggregateOptions} from '../IAggregateOptions';
import {StorageApi} from '../../../../api/Storage.api';
import {SelectQueryBuilder} from 'typeorm';
import {XS_P_$COUNT, XS_P_$LIMIT, XS_P_$OFFSET} from '../../../Constants';
import {ISqlParam, TypeOrmSqlConditionsBuilder} from './TypeOrmSqlConditionsBuilder';
import {
  AbstractOperator,
  Count,
  Group,
  IMangoWalker,
  Limit,
  MangoExpression,
  Match,
  PAst,
  PObject,
  Project,
  PValue,
  Skip,
  Sort,
  Value,
  ValueRef
} from '@allgemein/mango-expressions';
import {TypeOrmEntityController} from './TypeOrmEntityController';
import {convertPropertyValueJsonToString} from './Helper';
import {TypeOrmUtils} from './TypeOrmUtils';
import {IMangoWalkerControl} from '@allgemein/mango-expressions/IMangoWalker';
import {GROUP_ID} from '@allgemein/mango-expressions/operators/stage/Group';


export interface ISqlAggregateParam {
  select?: any;
  groupBy?: any;
}

export class AggregateOp<T> implements IAggregateOp, IMangoWalker {

  readonly controller: TypeOrmEntityController;

  protected entityType: Function | string | ClassType<any>;

  protected pipeline: any[];

  protected options: IAggregateOptions;

  protected entityRef: IEntityRef;

  error: Error = null;

  private cacheFields: { name: string, alias: string, type: 'select' | 'group' }[];

  private firstSelect: boolean;

  private countName: string;

  private alias: string;

  private queryBuilder: SelectQueryBuilder<T>;

  private stage: 'project' | 'group';

  private limit: number;

  private offset: number;

  private sort: { [key: string]: 'asc' | 'desc' };

  constructor(controller: TypeOrmEntityController) {
    this.controller = controller;
  }

  getEntityType() {
    return this.entityType;
  }

  getPipeline() {
    return this.pipeline;
  }

  getOptions() {
    return this.options;
  }


  async run(cls: Function | string | ClassType<any>, pipeline: any[], options: IAggregateOptions = {}): Promise<any[]> {
    if (_.isEmpty(pipeline) || !_.isArray(pipeline)) {
      throw new Error('aggregate: pipeline is not an array or is empty');
    }

    this.limit = 0;
    this.offset = 0;
    this.sort = _.get(options, 'sort', {});


    this.entityType = cls;
    this.pipeline = pipeline;
    this.options = options;
    this.entityRef = TypeOrmEntityRegistry.$().getEntityRefFor(cls);
    let results: any[] = [];


    if (options && options.limit) {
      this.limit = options.limit;
    }

    if (options && options.offset) {
      this.offset = options.offset;
    }


    await this.controller.invoker.use(StorageApi).doBeforeAggregate(this);

    if (this.controller.storageRef.dbType === 'mongodb') {
      results = await this.aggregateMongo(this.entityRef, pipeline, options);
    } else {
      results = await this.aggregateSql(this.entityRef, pipeline, options);
    }

    await this.controller.invoker.use(StorageApi).doAfterAggregate(results, this.error, this);

    if (this.error) {
      throw this.error;
    }

    return results;
  }

  private async aggregateSql(entityDef: IEntityRef, pipeline: any[], options: IAggregateOptions = {}): Promise<any[]> {

    this.cacheFields = [];
    this.firstSelect = false;
    this.alias = 'aggr';

    // throw new NotYetImplementedError('interpretation of aggregate array in pending ... ');
    let results: any[] = [];

    const connection = await this.controller.connect();
    try {
      const repo = connection.manager.getRepository(entityDef.getClassRef().getClass());

      if (pipeline) {
        TreeUtils.walk(pipeline, x => {
          if (x.key && _.isString(x.key)) {
            if (x.key === '$like') {
              x.parent['$regex'] = x.parent[x.key].replace('%%', '#$#').replace('%', '.*').replace('#$#', '%%');
            }
          }
        });
      }
      // const _alias = 'aggr';
      this.queryBuilder = repo.createQueryBuilder(this.alias) as SelectQueryBuilder<T>;

      const pipelineExp = new MangoExpression(pipeline);
      pipelineExp.visit(this);


      // const countQb = qb.clone().select('COUNT( DISTINCT ' + cacheFields.map(x => x.name).join(', ') + ')');
      // TODO try catch
      let count = -1;
      if (!_.get(options, 'disableCount', false)) {
        try {
          const sql = this.queryBuilder.getQueryAndParameters();
          const countQb = await repo.query(
            'SELECT COUNT( * ) as cnt FROM ( ' + sql[0] + ' ) as countQuery', sql[1]
          );
          if (countQb.length === 1) {
            const cntValue = countQb.shift()['cnt'];
            if (/\d+/.test(cntValue)) {
              count = parseInt(cntValue, 0);
            } else {
              count = -2;
            }
          }
        } catch (e) {
          count = -2;
        }
      } else {
        count = -2;
      }

      if (this.offset > 0) {
        this.queryBuilder.offset(this.offset);
      }

      if (this.limit > 0) {
        this.queryBuilder.limit(this.limit);
      }

      if (this.sort) {
        const nullSupport = this.controller.storageRef.getSchemaHandler().supportsSortNull();
        // const alias = this.queryBuilder.alias;
        _.keys(this.sort).forEach(k => {
          const _k = TypeOrmUtils.aliasKey(this.queryBuilder, k);
          if (nullSupport) {
            this.queryBuilder.addOrderBy(_k, this.sort[k] === 'asc' ? 'ASC' : 'DESC',
              this.sort[k] === 'asc' ? 'NULLS FIRST' : 'NULLS LAST'
            );
          } else {
            this.queryBuilder.addOrderBy(_k, this.sort[k] === 'asc' ? 'ASC' : 'DESC');
          }
        });
      }

      if (this.countName && _.isString(this.countName)) {
        results = {} as any;
        results[this.countName] = count;
      } else {
        const _results = await this.queryBuilder.getRawMany();
        // remove aliases
        const autoParseNumbers = _.get(this.options, 'autoParseNumbers', false);
        for (const res of _results) {
          const newRes: any = {};
          _.keys(res).forEach(k => {
            const newKey = k.replace(this.alias + '_', '');
            let v = res[k];

            if (autoParseNumbers) {
              if (_.isString(v)) {
                if (/^\d+$/.test(v)) {
                  v = parseInt(v, 0);
                } else if (/^\d+\.\d+$/.test(v)) {
                  v = parseFloat(v);
                }
              }
            }
            newRes[newKey] = v;
          });
          results.push(newRes);
        }

        const jsonPropertySupport = this.controller.storageRef.getSchemaHandler().supportsJson();
        if (!jsonPropertySupport) {
          convertPropertyValueJsonToString(this.entityRef, results);
        }

        results[XS_P_$LIMIT] = this.limit;
        results[XS_P_$OFFSET] = this.offset;
        results[XS_P_$COUNT] = count;
      }
    } catch (e) {
      this.error = e;
    } finally {
      await connection.close();
    }
    return results;
  }


  private async aggregateMongo(entityDef: IEntityRef, pipeline: any[], options: IAggregateOptions = {}): Promise<any[]> {
    const results: any[] = [];

    const connection = await this.controller.connect();
    try {
      const repo = connection.manager.getMongoRepository(entityDef.getClassRef().getClass());

      if (pipeline) {
        TreeUtils.walk(pipeline, x => {
          if (x.key && _.isString(x.key)) {
            if (x.key === '$like') {
              x.parent['$regex'] = x.parent[x.key].replace('%%', '#$#').replace('%', '.*').replace('#$#', '%%');
            }
          }
        });
      }

      if (!_.isEmpty(this.sort)) {
        const sort = {};
        _.keys(this.sort).forEach(x => {
          sort[x] = this.sort[x] === 'asc' ? 1 : -1;
        });
        pipeline.push({$sort: sort});
      }

      const countPipeline = _.clone(pipeline);
      countPipeline.push({$count: 'count'});
      let count = -1;
      try {
        const countAll = await repo.aggregate(countPipeline).next();
        count = _.get(countAll, 'count', count);
      } catch (e) {

      }


      const r = repo.aggregate(pipeline);

      if (this.offset) {
        r.skip(this.offset);
      }
      if (this.limit) {
        r.limit(this.limit);
      }
      let n: any = null;
      while (n = await r.next()) {
        results.push(n);
      }


      results[XS_P_$LIMIT] = this.limit;
      results[XS_P_$OFFSET] = this.offset;
      results[XS_P_$COUNT] = count;

    } catch (e) {
      this.error = e;
    } finally {
      await connection.close();
    }
    return results;
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
    return res;
  }


  onValue(ast: PAst): any {
    if (this.stage === 'project') {
      /**
       * Variants:
       *
       * $project: {alias => $field}
       *
       * $project: {field => 1}
       *
       * $project: '$field'
       *
       * $project: ['$field1','$field2']
       *
       * // see Operators
       *
       * $project: {'year': {$year: '$dateField'}}
       *
       */
      const inOperator = !!ast.backwardCall(x => x instanceof AbstractOperator && x.name !== 'project');
      if (!inOperator && ast instanceof ValueRef) {
        const alias = ast.key;
        const field = ast.value;
        return this.addSelectField(field, _.isString(alias) ? alias : null, 'select');
      } else if (ast instanceof ValueRef) {
        return this.alias + '.' + ast.value;
      } else if (ast instanceof Value) {
        return ast;
      }
    } else if (this.stage === 'group' && ast instanceof PValue) {
      if (ast.context.get(GROUP_ID)) {

        if (ast.parent instanceof AbstractOperator && !(ast.parent instanceof Group)) {
          return ast;
        }

        // if in an operator then return value
        if (_.isString(ast.value)) {
          /**
           * $group: {_id: '$someField'}
           *
           * $group: {_id: {test: '$someField'}}
           *
           * $group: {_id: ['$someField']}
           */
          const _groupBy = ast.value;
          const op = this.addSelectField(_groupBy, _.isString(ast.key) && ast.key !== '_id' ? ast.key : null, 'group');
          this.queryBuilder.addGroupBy(this.alias + '.' + _groupBy);
          return op;
        } else if (_.isNull(ast.value) && ast.key === '_id') {
          return null;
        }
      }
    } else if (ast instanceof PValue) {
      return ast.value;
    }
    return ast;
  }


  onOperator(ast: PAst, valueRes: any): any {
    if (this.stage === 'project' && ast instanceof AbstractOperator) {
      /**
       * // see Operators
       *
       * $project: {'year': {$year: '$dateField'}}
       *
       */
      const insideOperator = ast.parent instanceof AbstractOperator &&
        !(ast.parent instanceof Project);
      const handler = this.controller.storageRef.getSchemaHandler();
      if (!insideOperator) {
        if (_.isString(valueRes)) {
          const fn = handler.getOperationHandle(ast.name);
          return this.addSelectField(fn(valueRes), _.isString(ast.key) ? ast.key : null, 'operation');
        } else if (_.has(valueRes, 'q')) {
          // initial operator
          const fn = handler.getOperationHandle(ast.name);
          return this.addSelectField(fn(valueRes.q), _.isString(ast.key) ? ast.key : null, 'operation');
        } else if (valueRes instanceof Value) {
          const fn = handler.getOperationHandle(ast.name);
          return this.addSelectField(fn(handler.escape(valueRes.value)), _.isString(ast.key) ? ast.key : null, 'operation');
        }
      } else {
        // inside an operator return
        const fn = handler.getOperationHandle(ast.name);
        if (_.has(valueRes, 'q')) {
          return {q: fn(valueRes.q)};
        } else {
          return {q: fn(valueRes)};
        }
      }
    } else if (this.stage === 'group' && ast instanceof AbstractOperator) {
      const inId = !!ast.context.get(GROUP_ID);
      const handler = this.controller.storageRef.getSchemaHandler();
      const insideOperator = ast.parent instanceof AbstractOperator && !(ast.parent instanceof Group);
      if (!inId) {
        if (_.isString(valueRes)) {
          const fn = handler.getOperationHandle(ast.name);
          return this.addSelectField(fn(valueRes), _.isString(ast.key) ? ast.key : null, 'operation');
        } else if (valueRes instanceof Value) {
          const fn = handler.getOperationHandle(ast.name);
          return this.addSelectField(fn(handler.escape(valueRes.value)), _.isString(ast.key) ? ast.key : null, 'operation');
        } else if (valueRes instanceof ValueRef) {
          const fn = handler.getOperationHandle(ast.name);
          return this.addSelectField(fn(this.alias + '.' + valueRes.value), _.isString(ast.key) ? ast.key : null, 'operation');
        }
      } else {
        // is inside $group._id
        let syntax = null;
        const fn = handler.getOperationHandle(ast.name);
        if (_.isString(valueRes)) {
          syntax = fn(this.alias + '.' + valueRes);
        } else if (valueRes instanceof Value) {
          syntax = fn(handler.escape(valueRes.value));
        } else if (valueRes instanceof ValueRef) {
          syntax = fn(this.alias + '.' + valueRes.value);
        } else {
          throw new NotSupportedError('value result is ' + JSON.stringify(valueRes));
        }

        if (insideOperator) {
          return <ISqlParam>{q: syntax};
        } else {
          const op = this.addSelectField(syntax, _.isString(ast.key) ? ast.key : null, 'operation');
          this.queryBuilder.addGroupBy(syntax);
          return op;
        }
      }
    } else if (ast instanceof Sort) {
      if (ast.value instanceof PObject) {
        this.sort = {};
        ast.value.getValues().forEach((x: any) => {
          if (_.isNumber(x.value) && (x.value === 1 || x.value === -1)) {
            this.sort[this.alias + '.' + x.key] = x.value === 1 ? 'asc' : 'desc';
          } else {
            throw new Error('sort has wrong value ' + x.key + ' => ' + x.value);
          }
        });
      }
    } else if (ast instanceof Skip) {
      if (_.isNumber(valueRes)) {
        this.offset = valueRes;
      } else {
        throw new Error('offset has wrong value ' + valueRes);
      }
    } else if (ast instanceof Limit) {
      if (_.isNumber(valueRes)) {
        this.limit = valueRes;
      } else {
        throw new Error('limit has wrong value ' + valueRes);
      }
    } else if (ast instanceof Count) {
      if (_.isString(valueRes)) {
        this.countName = valueRes;
      } else {
        throw new Error('limit has wrong value ' + valueRes);
      }
    }
    return null;
  }


  visitOperator(ast: PAst, state: IMangoWalkerControl = {}): any {
    if (ast instanceof Match) {
      state.abort = true;
      if (ast.value) {
        const fieldKeys = ast.value.keys();
        const groupBy = this.cacheFields.filter(x =>
          ['group', 'operation'].includes(x.type) && (fieldKeys.includes(x.name) || fieldKeys.includes(x.alias))
        );
        const builder = new TypeOrmSqlConditionsBuilder<T>(this.queryBuilder, this.entityRef, this.controller.storageRef, 'select');
        if (groupBy.length > 0) {
          // is having mode
          builder.setMode('having');
          builder.build(ast.value);
          // having.whereFactory(this.queryBuilder);
        } else {
          builder.setMode('where');
          builder.build(ast.value);
          // this.queryBuilder.where(where);
        }
      } else {
        throw new Error('match value is empty');
      }
    } else if (ast instanceof Project) {
      this.stage = 'project';
    } else if (ast instanceof Group) {
      this.stage = 'group';
    }
    return null;
  }


  leaveOperator(res: any, ast: PAst) {
    if (ast instanceof Project || ast instanceof Group) {
      this.stage = undefined;
    }
    return res;
  }


  addSelectField(value: string | string[], alias?: string, mode: 'select' | 'group' | 'operation' = 'select') {

    let values: any = null;
    if (_.isArray(value)) {
      values = value.map(x => this.alias + '.' + x);
    } else if (mode === 'operation') {
      values = value;
    } else {
      values = this.alias + '.' + value;
    }

    if (!this.firstSelect) {
      alias && _.isString(alias) ? this.queryBuilder.select(values, alias) : this.queryBuilder.select(values);
      this.firstSelect = true;
    } else {
      alias && _.isString(alias) ? this.queryBuilder.addSelect(values, alias) : this.queryBuilder.addSelect(values);
    }


    let op: any;
    if (_.isArray(value)) {
      op = [];
      value.forEach(x => {
        const _op: any = {name: x, alias: null, type: mode};
        this.cacheFields.push(_op);
      });
    } else {
      op = {name: value, alias: alias, type: mode};
      this.cacheFields.push(op);
    }

    return op;
  }

}


