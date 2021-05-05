import {ClassType, IEntityRef} from '@allgemein/schema-api';
import {IUpdateOp} from '../IUpdateOp';
import {TypeOrmEntityRegistry} from './schema/TypeOrmEntityRegistry';
import {TreeUtils} from '@allgemein/base';
import * as _ from 'lodash';
import {IUpdateOptions} from '../IUpdateOptions';
import {TypeOrmSqlConditionsBuilder} from './TypeOrmSqlConditionsBuilder';
import {UpdateQueryBuilder} from 'typeorm';
import {StorageApi} from '../../../../api/Storage.api';
import {TypeOrmEntityController} from './TypeOrmEntityController';
import {convertPropertyValueJsonToString} from './Helper';


export class UpdateOp<T> implements IUpdateOp<T> {

  error: Error = null;

  readonly controller: TypeOrmEntityController;

  protected entityType: ClassType<T>;

  protected condition: any;

  protected update: any;

  protected entityRef: IEntityRef;

  protected options: IUpdateOptions;

  constructor(controller: TypeOrmEntityController) {
    this.controller = controller;
  }

  getConditions() {
    return this.condition;
  }

  getUpdate() {
    return this.update;
  }

  getEntityType() {
    return this.entityType;
  }

  getOptions() {
    return this.options;
  }

  async run(cls: ClassType<T>, condition: any, update: any, options?: IUpdateOptions): Promise<number> {
    this.entityType = cls;
    this.condition = condition;
    this.update = update;
    this.options = options;

    this.entityRef = TypeOrmEntityRegistry.$().getEntityRefFor(this.entityType);
    let results: number = -1;

    await this.controller.invoker.use(StorageApi).doBeforeUpdate(this);

    if (this.controller.storageRef.dbType === 'mongodb') {
      results = await this.updateMongo();
    } else {
      results = await this.updateSql();
    }

    await this.controller.invoker.use(StorageApi).doAfterUpdate(results, this.error, this);
    if (this.error) {
      throw this.error;
    }
    return results;
  }

  /**
   * when returns -2 then affected is not supported, so update worked but how many records ware changes is not given back
   */
  private async updateSql(): Promise<number> {
    const jsonPropertySupport = this.controller.storageRef.getSchemaHandler().supportsJson();
    let affected = -1;
    const connection = await this.controller.connect();
    try {
      let qb: UpdateQueryBuilder<T> = null;
      if (this.condition) {
        const builder = new TypeOrmSqlConditionsBuilder<T>(connection.manager, this.entityRef, this.controller.getStorageRef(), 'update');
        builder.build(this.condition);
        qb = builder.getQueryBuilder() as UpdateQueryBuilder<T>;
        // qb.where(where);
      } else {
        qb = connection.manager
          .getRepository(this.entityRef.getClassRef().getClass())
          .createQueryBuilder().update() as UpdateQueryBuilder<T>;
      }

      // TODO make this better currently Hacki hacki
      let hasUpdate = false;
      let updateData = null;
      if (_.has(this.update, '$set')) {
        updateData = this.update['$set'];
        hasUpdate = true;
      } else if (!_.isEmpty(this.update)) {
        updateData = this.update;
        hasUpdate = true;
      }
      affected = 0;

      if (hasUpdate) {

        if (!jsonPropertySupport) {
          convertPropertyValueJsonToString(this.entityRef, updateData);
        }
        qb.set(updateData);

        if (_.has(this.options, 'limit')) {
          qb.limit(this.options['limit']);
        }
        const r = await qb.execute();
        affected = _.get(r, 'affected', -2);
      }
    } catch (e) {
      this.error = e;
    } finally {
      await connection.close();

    }
    return affected;
  }


  private async updateMongo(): Promise<number> {
    let affected = -1;
    const connection = await this.controller.connect();
    try {
      const repo = connection.manager.getMongoRepository(this.entityRef.getClassRef().getClass());

      if (this.condition) {
        TreeUtils.walk(this.condition, x => {
          if (x.key && _.isString(x.key)) {
            if (x.key === '$like') {
              x.parent['$regex'] = x.parent[x.key].replace('%%', '#$#').replace('%', '.*').replace('#$#', '%%');
            }
          }
        });
      }

      const r = await repo.updateMany(this.condition, this.update, this.options);
      affected = r.modifiedCount;
    } catch (e) {
      this.error = e;
    } finally {
      await connection.close();

    }
    return affected;
  }

}


