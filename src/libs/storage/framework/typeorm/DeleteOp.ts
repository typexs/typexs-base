import * as _ from 'lodash';

import {IDeleteOp} from '../IDeleteOp';
import {StorageEntityController} from '../../StorageEntityController';
import {TypeOrmUtils} from './TypeOrmUtils';
import {ClassType} from 'commons-schema-api';
import {TypeOrmSqlConditionsBuilder} from './TypeOrmSqlConditionsBuilder';
import {TypeOrmEntityRegistry} from './schema/TypeOrmEntityRegistry';
import {IDeleteOptions} from '../IDeleteOptions';


export class DeleteOp<T> implements IDeleteOp<T> {

  readonly controller: StorageEntityController;

  error: Error = null;

  private objects: any[] = [];

  constructor(controller: StorageEntityController) {
    this.controller = controller;
  }

  private isMongoDB() {
    return this.controller.storageRef.dbType === 'mongodb';
  }


  async run(object: T[] | T | ClassType<T>, conditions: any = null, options: IDeleteOptions = {}): Promise<T[] | T | number> {
    if (_.isFunction(object)) {
      return this.removeByCondition(<ClassType<T>>object, conditions);
    } else {
      return this.remove(<T | T[]>object);
    }
  }

  private async removeByCondition(object: ClassType<T>, condition: any) {
    let count = -1;
    const connection = await this.controller.connect();
    try {
      const entityName = TypeOrmUtils.resolveName(object);
      if (this.isMongoDB()) {
        const p = await connection.manager.getMongoRepository(entityName).deleteMany(condition);
        return p.deletedCount;
      } else {
        // start transaction, got to leafs and save
        await connection.manager.transaction(async em => {
          const x = new TypeOrmSqlConditionsBuilder(em, TypeOrmEntityRegistry.$().getEntityRefByName(entityName));
          const qb = x.getQueryBuilder();
          const result = await qb.delete().where(x.build(condition)).execute();
          // depends by db type
          count = result.affected ? result.affected : 0;
          return result.affected;
        });
      }
    } catch (e) {
      this.error = e;
    } finally {
      await connection.close();
      if (this.error) {
        throw this.error;
      }
    }
    return count;
  }

  private async remove(object: T[] | T) {
    const isArray = _.isArray(object);
    const connection = await this.controller.connect();
    try {
      this.objects = this.prepare(object);

      const resolveByEntityDef = TypeOrmUtils.resolveByEntityDef(this.objects);
      const entityNames = _.keys(resolveByEntityDef);


      if (this.isMongoDB()) {
        const promises = [];
        for (const entityName of entityNames) {
          const p = connection.manager.getMongoRepository(entityName).remove(resolveByEntityDef[entityName]);
          promises.push(p);
        }
        await Promise.all(promises);
      } else {
        // start transaction, got to leafs and save
        await connection.manager.transaction(async em => {
          const promises = [];
          for (const entityName of entityNames) {
            const p = em.getRepository(entityName).remove(resolveByEntityDef[entityName]);
            promises.push(p);
          }
          return Promise.all(promises);
        });
      }
    } catch (e) {
      this.error = e;
    } finally {
      await connection.close();
      if (this.error) {
        throw this.error;
      }
    }
    
    if (!isArray) {
      return this.objects.shift();
    }
    return this.objects;

  }


  private prepare(object: T | T[]): T[] {
    let objs: T[] = [];
    if (_.isArray(object)) {
      objs = object;
    } else {
      objs.push(object);
    }
    return objs;
  }


}
