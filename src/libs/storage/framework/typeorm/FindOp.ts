import * as _ from 'lodash';
import {IFindOp} from '../IFindOp';
import {IFindOptions} from '../IFindOptions';
import {StorageEntityController} from '../../StorageEntityController';


import {XS_P_$COUNT, XS_P_$LIMIT, XS_P_$OFFSET} from '../../../Constants';

import {TypeOrmSqlConditionsBuilder} from './TypeOrmSqlConditionsBuilder';
import {TypeOrmEntityRegistry} from './schema/TypeOrmEntityRegistry';
import {TreeUtils} from 'commons-base';
import {SelectQueryBuilder} from 'typeorm';
import {ClassType} from 'commons-schema-api';
import {StorageApi} from '../../../../api/Storage.api';


export class FindOp<T> implements IFindOp<T> {

  readonly controller: StorageEntityController;

  protected options: IFindOptions;

  protected entityType: Function | string | ClassType<T>;

  protected findConditions: any;

  protected error: Error = null;

  constructor(controller: StorageEntityController) {
    this.controller = controller;
  }

  getFindConditions() {
    return this.findConditions;
  }

  getEntityType() {
    return this.entityType;
  }

  getOptions() {
    return this.options;
  }

  async run(entityType: Function | string | ClassType<T>, findConditions?: any, options?: IFindOptions): Promise<T[]> {
    this.entityType = entityType;
    this.findConditions = findConditions;

    _.defaults(options, {
      limit: 50,
      offset: null,
      sort: null
    });
    this.options = options;

    await this.controller.invoker.use(StorageApi).doBeforeFind(this);

    let results: T[] = [];
    if (this.controller.storageRef.dbType === 'mongodb') {
      results = await this.findMongo(entityType, findConditions);
    } else {
      results = await this.find(entityType, findConditions);
    }

    await this.controller.invoker.use(StorageApi).doAfterFind(results, this.error, this);

    if (this.error) {
      throw this.error;
    }

    return results;
  }


  private async find(entityType: Function | string | ClassType<T>, findConditions?: any): Promise<T[]> {
    const connection = await this.controller.connect();
    let results: T[] = [];
    try {
      // const repo = connection.manager.getRepository(entityType);
      // const qb = repo.createQueryBuilder() as SelectQueryBuilder<T>;
      let qb: SelectQueryBuilder<T> = null;
      const entityRef = TypeOrmEntityRegistry.$().getEntityRefFor(entityType);
      if (findConditions) {
        const builder = new TypeOrmSqlConditionsBuilder<T>(connection.manager, entityRef, this.controller.getStorageRef(), 'select');
        const where = builder.build(findConditions);
        qb = builder.getQueryBuilder() as SelectQueryBuilder<T>;
        // builder.getJoins().forEach(join => {
        //   qb.leftJoin(join.table, join.alias, join.condition);
        // });
        qb.where(where);
      } else {
        qb = connection.manager.getRepository(entityType).createQueryBuilder() as SelectQueryBuilder<T>;
      }

      const recordCount = await qb.getCount();

      if (!_.isNull(this.options.limit) && _.isNumber(this.options.limit)) {
        qb.limit(this.options.limit);
      }

      if (!_.isNull(this.options.offset) && _.isNumber(this.options.offset)) {
        qb.offset(this.options.offset);
      }

      if (_.isNull(this.options.sort)) {
        entityRef.getPropertyRefs().filter(x => x.isIdentifier()).forEach(x => {
          qb.addOrderBy(qb.alias + '.' + x.storingName, 'ASC');
        });
      } else {
        _.keys(this.options.sort).forEach(sortKey => {
          const v: string = this.options.sort[sortKey];
          qb.addOrderBy(qb.alias + '.' + sortKey, <'ASC' | 'DESC'>v.toUpperCase());
        });
      }

      results = this.options.raw ? await qb.getRawMany() : await qb.getMany();
      results[XS_P_$COUNT] = recordCount;
      results[XS_P_$OFFSET] = this.options.offset;
      results[XS_P_$LIMIT] = this.options.limit;
    } catch (e) {
      this.error = e;
    } finally {
      await connection.close();

    }

    return results;
  }


  private async findMongo(entityType: Function | string, findConditions?: any): Promise<T[]> {
    const results: T[] = [];
    const connection = await this.controller.connect();
    try {
      const repo = connection.manager.getMongoRepository(entityType);

      if (findConditions) {
        TreeUtils.walk(findConditions, x => {
          if (x.key && _.isString(x.key)) {
            if (x.key === '$like') {
              x.parent['$regex'] = x.parent[x.key].replace('%%', '#$#').replace('%', '.*').replace('#$#', '%%');
            }
          }
        });
      }

      const qb = this.options.raw ? repo.createCursor(findConditions) : repo.createEntityCursor(findConditions);

      if (!_.isNull(this.options.limit) && _.isNumber(this.options.limit)) {
        qb.limit(this.options.limit);
      }

      if (!_.isNull(this.options.offset) && _.isNumber(this.options.offset)) {
        qb.skip(this.options.offset);
      }

      if (!_.isNull(this.options.sort)) {
        const s: any[] = [];
        _.keys(this.options.sort).forEach(sortKey => {
          const v: string = this.options.sort[sortKey];
          s.push([sortKey, v === 'asc' ? 1 : -1]);
        });
        qb.sort(s);
      }

      const recordCount = await qb.count(false);


      while (await qb.hasNext()) {
        results.push(await qb.next());
      }

      results[XS_P_$COUNT] = recordCount;
      results[XS_P_$OFFSET] = this.options.offset;
      results[XS_P_$LIMIT] = this.options.limit;
    } catch (e) {
      this.error = e;
    } finally {
      await connection.close();

    }

    return results;
  }

}


