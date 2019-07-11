import * as _ from 'lodash';
import {IFindOp} from '../IFindOp';
import {IFindOptions} from '../IFindOptions';
import {StorageEntityController} from '../../StorageEntityController';
import {ConnectionWrapper} from '../../ConnectionWrapper';


import {XS_P_$COUNT, XS_P_$LIMIT, XS_P_$OFFSET} from '../../../Constants';

import {TypeOrmSqlConditionsBuilder} from './TypeOrmSqlConditionsBuilder';
import {TypeOrmEntityRegistry} from './schema/TypeOrmEntityRegistry';
import {TreeUtils} from '../../../..';


export class FindOp<T> implements IFindOp<T> {

  readonly controller: StorageEntityController;
  private connection: ConnectionWrapper;
  private options: IFindOptions;

  constructor(controller: StorageEntityController) {
    this.controller = controller;
  }

  async run(entityType: Function | string, findConditions?: any, options?: IFindOptions): Promise<T[]> {
    _.defaults(options, {
      limit: 50,
      offset: null,
      sort: null
    });
    this.options = options;

    this.connection = await this.controller.storageRef.connect();
    let results: T[] = [];
    if (this.controller.storageRef.dbType == 'mongodb') {
      results = await this.findMongo(entityType, findConditions);
    } else {
      results = await this.find(entityType, findConditions);
    }
    await this.connection.close();
    return results;
  }

  private async find(entityType: Function | string, findConditions?: any): Promise<T[]> {
    const repo = this.connection.manager.getRepository(entityType);
    const qb = repo.createQueryBuilder();
    const entityDef = TypeOrmEntityRegistry.$().getEntityRefFor(entityType);
    if (findConditions) {
      const builder = new TypeOrmSqlConditionsBuilder(entityDef, qb.alias);
      const where = builder.build(findConditions);
      builder.getJoins().forEach(join => {
        qb.leftJoin(join.table, join.alias, join.condition);
      });
      qb.where(where);
    }

    const recordCount = await qb.getCount();

    if (!_.isNull(this.options.limit) && _.isNumber(this.options.limit)) {
      qb.limit(this.options.limit);
    }

    if (!_.isNull(this.options.offset) && _.isNumber(this.options.offset)) {
      qb.offset(this.options.offset);
    }

    if (_.isNull(this.options.sort)) {
      entityDef.getPropertyRefs().filter(x => x.isIdentifier()).forEach(x => {
        qb.addOrderBy(qb.alias + '.' + x.storingName, 'ASC');
      });
    } else {
      _.keys(this.options.sort).forEach(sortKey => {
        const v: string = this.options.sort[sortKey];
        qb.addOrderBy(qb.alias + '.' + sortKey, <'ASC' | 'DESC'>v.toUpperCase());
      });
    }

    const results = this.options.raw ? await qb.getRawMany() : await qb.getMany();
    results[XS_P_$COUNT] = recordCount;
    results[XS_P_$OFFSET] = this.options.offset;
    results[XS_P_$LIMIT] = this.options.limit;

    return results;
  }


  private async findMongo(entityType: Function | string, findConditions?: any): Promise<T[]> {
    const repo = this.connection.manager.getMongoRepository(entityType);

    if (findConditions) {
      TreeUtils.walk(findConditions, x => {
        if (x.key && _.isString(x.key)) {
          if (x.key == '$like') {
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

    const results: T[] = [];

    while (await qb.hasNext()) {
      results.push(await qb.next());
    }

    results[XS_P_$COUNT] = recordCount;
    results[XS_P_$OFFSET] = this.options.offset;
    results[XS_P_$LIMIT] = this.options.limit;

    return results;
  }

}


