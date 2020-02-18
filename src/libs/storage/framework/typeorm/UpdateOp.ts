import {StorageEntityController} from '../../StorageEntityController';
import {ClassType, IEntityRef} from 'commons-schema-api';
import {IUpdateOp} from '../IUpdateOp';
import {TypeOrmEntityRegistry} from './schema/TypeOrmEntityRegistry';
import {TreeUtils} from 'commons-base';
import * as _ from 'lodash';
import {IUpdateOptions} from '../IUpdateOptions';
import {TypeOrmSqlConditionsBuilder} from './TypeOrmSqlConditionsBuilder';
import {UpdateQueryBuilder} from 'typeorm';


export class UpdateOp<T> implements IUpdateOp<T> {

  error: Error = null;

  readonly controller: StorageEntityController;

  constructor(controller: StorageEntityController) {
    this.controller = controller;
  }

  async run(cls: ClassType<T>, condition: any, update: any, options?: IUpdateOptions): Promise<number> {
    const entityDef = TypeOrmEntityRegistry.$().getEntityRefFor(cls);
    let results: number = -1;
    if (this.controller.storageRef.dbType === 'mongodb') {
      results = await this.updateMongo(entityDef, condition, update, options);
    } else {
      results = await this.update(entityDef, condition, update, options);
    }

    return results;
  }

  private async update(entityDef: IEntityRef, findConditions: any, update: any, options: IUpdateOptions = {}): Promise<number> {
    let affected = -1;
    const connection = await this.controller.connect();
    try {
      let qb: UpdateQueryBuilder<T> = null;
      if (findConditions) {
        const builder = new TypeOrmSqlConditionsBuilder<T>(connection.manager, entityDef);
        const where = builder.build(findConditions);
        qb = builder.getQueryBuilder().update();
        qb.where(where);
      } else {
        qb = connection.manager.getRepository(entityDef.getClassRef().getClass()).createQueryBuilder().update() as UpdateQueryBuilder<T>;
      }

      let hasUpdate = false;
      if (_.has(update, '$set')) {
        qb.set(update['$set']);
        hasUpdate = true;
      } else if (!_.isEmpty(update)) {
        qb.set(update);
        hasUpdate = true;
      }
      affected = 0;

      if (hasUpdate) {
        if (_.has(options, 'limit')) {
          qb.limit(options['limit']);
        }
        const r = await qb.execute();
        affected = r.affected;
      }
    } catch (e) {
      this.error = e;
    } finally {
      await connection.close();
      if (this.error) {
        throw this.error;
      }
    }
    return affected;
  }


  private async updateMongo(entityDef: IEntityRef, findConditions: any, update: any, options: IUpdateOptions = {}): Promise<number> {
    let affected = -1;
    const connection = await this.controller.connect();
    try {
      const repo = connection.manager.getMongoRepository(entityDef.getClassRef().getClass());

      if (findConditions) {
        TreeUtils.walk(findConditions, x => {
          if (x.key && _.isString(x.key)) {
            if (x.key === '$like') {
              x.parent['$regex'] = x.parent[x.key].replace('%%', '#$#').replace('%', '.*').replace('#$#', '%%');
            }
          }
        });
      }

      const r = await repo.updateMany(findConditions, update, options);
      affected = r.modifiedCount;
    } catch (e) {
      this.error = e;
    } finally {
      await connection.close();
      if (this.error) {
        throw this.error;
      }
    }
    return affected;
  }

}


