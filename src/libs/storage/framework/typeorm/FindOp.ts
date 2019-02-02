import * as _ from 'lodash'
import {IFindOp} from "../IFindOp";
import {IFindOptions} from "../IFindOptions";
import {StorageEntityController} from "../../StorageEntityController";
import {ConnectionWrapper} from "../../ConnectionWrapper";


import {XS_P_$COUNT, XS_P_$LIMIT, XS_P_$OFFSET} from "../../../Constants";

import {TypeOrmSqlConditionsBuilder} from "./TypeOrmSqlConditionsBuilder";
import {TypeOrmEntityRegistry} from "./schema/TypeOrmEntityRegistry";


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
    let results:T[] = [];
    if (this.controller.storageRef.dbType == 'mongodb') {
      results = await this.findMongo(entityType, findConditions);
    } else {
      results = await  this.find(entityType, findConditions);
    }
    await this.connection.close();
    return results;
  }

  private async find(entityType: Function | string, findConditions?: any): Promise<T[]> {
    let repo = this.connection.manager.getRepository(entityType);
    let qb = repo.createQueryBuilder();
    let entityDef = TypeOrmEntityRegistry.$().getEntityRefFor(entityType);
    if (findConditions) {
      let builder = new TypeOrmSqlConditionsBuilder(entityDef, qb.alias);
      const where = builder.build(findConditions);
      builder.getJoins().forEach(join => {
        qb.leftJoin(join.table, join.alias, join.condition);
      });
      qb.where(where);
    }

    let recordCount = await qb.getCount();

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
        let v: string = this.options.sort[sortKey];
        qb.addOrderBy(qb.alias + '.' + sortKey, <"ASC" | 'DESC'>v.toUpperCase());
      })
    }

    let results = await this.options.raw ? qb.getRawMany() : qb.getMany();
    results[XS_P_$COUNT] = recordCount;
    results[XS_P_$OFFSET] = this.options.offset;
    results[XS_P_$LIMIT] = this.options.limit;

    return results;
  }


  private async findMongo(entityType: Function | string, findConditions?: any): Promise<T[]> {
    let repo = this.connection.manager.getMongoRepository(entityType);

    let qb = this.options.raw ? repo.createCursor(findConditions) : repo.createEntityCursor(findConditions);



    if (!_.isNull(this.options.limit) && _.isNumber(this.options.limit)) {
      qb.limit(this.options.limit);
    }

    if (!_.isNull(this.options.offset) && _.isNumber(this.options.offset)) {
      qb.skip(this.options.offset);
    }

    if (!_.isNull(this.options.sort)) {
      let s:any[] = [];
      _.keys(this.options.sort).forEach(sortKey => {
        let v: string = this.options.sort[sortKey];
        s.push([sortKey,v === 'asc' ? 1 : -1]);
      });
      qb.sort(s);
    }

    let recordCount = await qb.count(false);

    let results:T[] = [];

    while (await qb.hasNext()){
      results.push(await qb.next());
    }

    results[XS_P_$COUNT] = recordCount;
    results[XS_P_$OFFSET] = this.options.offset;
    results[XS_P_$LIMIT] = this.options.limit;

    return results;
  }

}


