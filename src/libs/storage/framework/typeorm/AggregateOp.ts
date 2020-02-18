import {StorageEntityController} from '../../StorageEntityController';
import {ClassType, IEntityRef} from 'commons-schema-api';
import {TypeOrmEntityRegistry} from './schema/TypeOrmEntityRegistry';
import {NotYetImplementedError, TreeUtils} from 'commons-base';
import * as _ from 'lodash';
import {IAggregateOp} from '../IAggregateOp';
import {IAggregateOptions} from '../IAggregateOptions';


export class AggregateOp<T> implements IAggregateOp {

  readonly controller: StorageEntityController;

  error: Error = null;

  constructor(controller: StorageEntityController) {
    this.controller = controller;
  }

  async run(cls: ClassType<T>, pipeline: any[], options: IAggregateOptions = {}): Promise<any[]> {
    const entityDef = TypeOrmEntityRegistry.$().getEntityRefFor(cls);
    let results: any[] = [];

    if (this.controller.storageRef.dbType === 'mongodb') {
      results = await this.aggregateMongo(entityDef, pipeline, options);
    } else {
      throw new NotYetImplementedError('interpretation of aggregate array in pending ... ');
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

      const r = repo.aggregate(pipeline, options);
      let n: any = null;
      while (n = await r.next()) {
        results.push(n);
      }
    } catch (e) {
      this.error = e;
    } finally {
      await connection.close();
      if (this.error) {
        throw this.error;
      }
    }

    return results;
  }

}


