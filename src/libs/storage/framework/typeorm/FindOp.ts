import * as _ from 'lodash';
import {IFindOp} from '../IFindOp';
import {IFindOptions} from '../IFindOptions';
import {XS_P_$COUNT, XS_P_$LIMIT, XS_P_$OFFSET} from '../../../Constants';
import {TypeOrmSqlConditionsBuilder} from './TypeOrmSqlConditionsBuilder';
import {TypeOrmEntityRegistry} from './schema/TypeOrmEntityRegistry';
import {ClassUtils, TreeUtils} from '@allgemein/base';
import {getMetadataArgsStorage, SelectQueryBuilder} from 'typeorm';
import {ClassType} from '@allgemein/schema-api';
import {StorageApi} from '../../../../api/Storage.api';
import {TypeOrmEntityController} from './TypeOrmEntityController';
import {Injector} from '../../../di/Injector';
import {Cache} from '../../../cache/Cache';
import {TypeOrmConnectionWrapper} from './TypeOrmConnectionWrapper';
import {convertPropertyValueStringToJson} from './Helper';
import {TypeOrmUtils} from './TypeOrmUtils';
import {REGISTRY_TYPEORM} from './Constants';


export class FindOp<T> implements IFindOp<T> {

  readonly controller: TypeOrmEntityController;

  protected options: IFindOptions;

  protected entityType: Function | string | ClassType<T>;

  protected findConditions: any;

  protected error: Error = null;

  constructor(controller: TypeOrmEntityController) {
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
    let cacheKey = null;
    let cache: Cache = null;
    let results: T[] = null;

    _.defaults(options, {
      limit: 50,
      offset: null,
      sort: null,
      cache: false
    });
    this.options = options;

    const jsonPropertySupport = this.controller.storageRef.getSchemaHandler().supportsJson();
    await this.controller.invoker.use(StorageApi).doBeforeFind(this);

    if (options.cache) {
      cache = (Injector.get(Cache.NAME) as Cache);
      cacheKey = [
        REGISTRY_TYPEORM,
        FindOp.name,
        ClassUtils.getClassName(this.entityType),
        JSON.stringify(findConditions),
        JSON.stringify(options)].join('--');
      results = await cache.get(cacheKey, 'storage_typeorm');
    }


    if (_.isNull(results)) {
      if (this.controller.storageRef.dbType === 'mongodb') {
        results = await this.findMongo(entityType, findConditions);
      } else {
        results = await this.find(entityType, findConditions);
      }
    }

    if (!jsonPropertySupport) {
      const entityRef = TypeOrmEntityRegistry.$().getEntityRefFor(entityType);
      convertPropertyValueStringToJson(entityRef, results);
    }
    await this.controller.invoker.use(StorageApi).doAfterFind(results, this.error, this);

    if (this.error) {
      throw this.error;
    }

    if (cacheKey) {
      cache.set(cacheKey, results, 'storage_typeorm', {ttl: 120000}).catch(reason => {
      });
    }

    return results;
  }


  private async find(entityType: Function | string | ClassType<T>, findConditions?: any): Promise<T[]> {
    let connection: TypeOrmConnectionWrapper = null;
    let results: T[] = [];
    try {
      // const repo = connection.manager.getRepository(entityType);
      // const qb = repo.createQueryBuilder() as SelectQueryBuilder<T>;
      let qb: SelectQueryBuilder<T> = null;
      const entityRef = this.controller.getStorageRef().getRegistry().getEntityRefFor(entityType);
      // connect only when type is already loaded
      connection = await this.controller.connect();
      if (findConditions && !_.isEmpty(findConditions)) {
        const builder = new TypeOrmSqlConditionsBuilder<T>(connection.manager, entityRef, this.controller.getStorageRef(), 'select');
        builder.build(findConditions);
        qb = builder.getQueryBuilder() as SelectQueryBuilder<T>;
      } else {
        qb = connection.manager.getRepository(entityType).createQueryBuilder() as SelectQueryBuilder<T>;
      }

      if (this.options.eager) {
        const refs = entityRef.getPropertyRefs().filter(x => x.isReference());
        for (const ref of refs) {
          const joinColumn = getMetadataArgsStorage().joinColumns
            .find(x => x.target === entityRef.getClass() && x.propertyName === ref.name);
          if (joinColumn) {
            qb.leftJoinAndSelect(
              [qb.alias, joinColumn.propertyName].join('.'),
              joinColumn.propertyName
            );
          } else {
            const relation = getMetadataArgsStorage().relations
              .find(x => x.target === entityRef.getClass() && x.propertyName === ref.name);
            if (relation) {
              if (
                relation.relationType === 'many-to-many' ||
                relation.relationType === 'many-to-one' ||
                relation.relationType === 'one-to-many') {
                qb.leftJoinAndSelect(
                  [qb.alias, relation.propertyName].join('.'),
                  relation.propertyName
                );
              }
            }

          }
        }
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
          qb.addOrderBy(TypeOrmUtils.aliasKey(qb, x.storingName), 'ASC');
        });
      } else {
        _.keys(this.options.sort).forEach(sortKey => {
          const v: string = this.options.sort[sortKey];
          qb.addOrderBy(TypeOrmUtils.aliasKey(qb, sortKey), <'ASC' | 'DESC'>v.toUpperCase());
        });
      }

      const q = qb.getSql();

      results = this.options.raw ? await qb.getRawMany() : await qb.getMany();
      results[XS_P_$COUNT] = recordCount;
      results[XS_P_$OFFSET] = this.options.offset;
      results[XS_P_$LIMIT] = this.options.limit;
    } catch (e) {
      this.error = e;
    } finally {
      if (connection) {
        await connection.close();
      }

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

      const recordCount = await repo.count(findConditions);
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

      // const recordCount = await qb.count(false);
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


