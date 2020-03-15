import {StorageEntityController} from '../../StorageEntityController';
import {ClassType, IEntityRef} from 'commons-schema-api';
import {TypeOrmEntityRegistry} from './schema/TypeOrmEntityRegistry';
import {NotYetImplementedError, TreeUtils} from 'commons-base';
import * as _ from 'lodash';
import {IAggregateOp} from '../IAggregateOp';
import {IAggregateOptions} from '../IAggregateOptions';
import {StorageApi} from '../../../../api/Storage.api';


export class AggregateOp<T> implements IAggregateOp {

  readonly controller: StorageEntityController;

  protected entityType: Function | string | ClassType<any>;

  protected pipeline: any[];

  protected options: IAggregateOptions;

  protected entityRef: IEntityRef;

  error: Error = null;

  constructor(controller: StorageEntityController) {
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
    this.entityType = cls;
    this.pipeline = pipeline;
    this.options = options;
    this.entityRef = TypeOrmEntityRegistry.$().getEntityRefFor(cls);
    let results: any[] = [];

    await this.controller.invoker.use(StorageApi).doBeforeAggregate(this);

    if (this.controller.storageRef.dbType === 'mongodb') {
      results = await this.aggregateMongo(this.entityRef, pipeline, options);
    } else {
      throw new NotYetImplementedError('interpretation of aggregate array in pending ... ');
    }

    await this.controller.invoker.use(StorageApi).doAfterAggregate(results, this.error, this);

    if (this.error) {
      throw this.error;
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

    }

    return results;
  }

}


