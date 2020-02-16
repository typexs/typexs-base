import * as _ from 'lodash';

import {ISaveOp} from '../ISaveOp';
import {StorageEntityController} from '../../StorageEntityController';
import {ISaveOptions} from '../ISaveOptions';
import {DataContainer} from '../../DataContainer';

import {TypeOrmUtils} from './TypeOrmUtils';
import {ObjectsNotValidError} from '../../../exceptions/ObjectsNotValidError';
import {TypeOrmEntityRegistry} from './schema/TypeOrmEntityRegistry';


export class SaveOp<T> implements ISaveOp<T> {


  readonly ec: StorageEntityController;

  private objects: T[] = [];

  // private c: ConnectionWrapper;


  constructor(controller: StorageEntityController) {
    this.ec = controller;
  }

  private isMongoDB() {
    return this.ec.storageRef.dbType === 'mongodb';
  }

  async run(object: T[] | T, options?: ISaveOptions): Promise<T[] | T> {
    _.defaults(options, {validate: false, raw: false});
    const isArray = _.isArray(object);

    this.objects = this.prepare(object);
    let objectsValid = true;
    if (_.get(options, 'validate', false)) {
      objectsValid = await this.validate();
    }


    if (objectsValid) {
      const promises: Promise<any>[] = [];
      const resolveByEntityDef = TypeOrmUtils.resolveByEntityDef(this.objects);
      const entityNames = _.keys(resolveByEntityDef);
      const c = await this.ec.connect();

      if (this.isMongoDB()) {


        for (const entityName of entityNames) {
          const repo = c.manager.getMongoRepository(entityName);
          const entityDef = TypeOrmEntityRegistry.$().getEntityRefFor(entityName);
          const propertyDef = entityDef.getPropertyRefs().find(p => p.isIdentifier());
          if (options.raw) {
            const bulk = repo.initializeOrderedBulkOp();
            resolveByEntityDef[entityName].forEach((e: any) => {
              if (!e._id && propertyDef.name !== '_id') {
                _.set(e, '_id', _.get(e, propertyDef.name, null));
              }
              // filter command values
              _.keys(e).filter(x => /^$/.test(x)).map(x => delete e[x]);
              bulk.find({_id: e._id}).upsert().replaceOne(e);
            });
            promises.push(bulk.execute());
          } else {
            resolveByEntityDef[entityName].forEach((entity: any) => {
              if (!entity._id && propertyDef.name !== '_id') {
                _.set(entity, '_id', _.get(entity, propertyDef.name, null));
              }
              // filter command values
              _.keys(entity).filter(x => /^$/.test(x)).map(x => delete entity[x]);
            });

            const p = repo.save(resolveByEntityDef[entityName]).then((x: any) => {
              resolveByEntityDef[entityName].forEach((x: any) => {
                if (!x._id && propertyDef.name !== '_id') {
                  _.set(x, '_id', _.get(x, propertyDef.name, null));
                }
              });
            });
            promises.push(p);
          }
        }

      } else {
        // start transaction, got to leafs and save
        if (c.isSingleConnection()) {
          options.noTransaction = true;
        }

        if (options.noTransaction) {
          for (const entityName of entityNames) {
            const p = c.manager.getRepository(entityName).save(resolveByEntityDef[entityName]);
            promises.push(p);
          }
        } else {
          const promise = c.manager.transaction(async em => {
            const _promises = [];
            for (const entityName of entityNames) {
              const p = em.getRepository(entityName).save(resolveByEntityDef[entityName]);
              _promises.push(p);
            }
            return Promise.all(_promises);
          });
          promises.push(promise);
        }
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
      await c.close();
    } else {
      throw new ObjectsNotValidError(this.objects, isArray);
    }

    if (!isArray) {
      return this.objects.shift();
    }
    return this.objects;
  }


  prepare(object: T | T[]): T[] {
    let objs: T[] = [];
    if (_.isArray(object)) {
      objs = object;
    } else {
      objs.push(object);
    }
    return objs;
  }


  private async validate() {
    let valid = true;
    await Promise.all(_.map(this.objects, o => new DataContainer(o, TypeOrmEntityRegistry.$())).map(async c => {
      valid = valid && await c.validate();
      if (!this.isMongoDB()) {
        c.applyState();
      }
    }));
    return valid;
  }


}
