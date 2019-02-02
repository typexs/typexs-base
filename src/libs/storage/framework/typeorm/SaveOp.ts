import * as _ from 'lodash';

import {ISaveOp} from "../ISaveOp";
import {ConnectionWrapper} from "../../ConnectionWrapper";
import {StorageEntityController} from "../../StorageEntityController";
import {ISaveOptions} from "../ISaveOptions";
import {DataContainer} from "../../DataContainer";

import {TypeOrmUtils} from "./TypeOrmUtils";
import {ObjectsNotValidError} from "../../../exceptions/ObjectsNotValidError";
import {TypeOrmEntityRegistry} from "./schema/TypeOrmEntityRegistry";



export class SaveOp<T> implements ISaveOp<T> {


  readonly ec: StorageEntityController;

  private objects: T[] = [];

  private c: ConnectionWrapper;


  constructor(controller: StorageEntityController) {
    this.ec = controller;
  }

  private isMongoDB() {
    return this.ec.storageRef.dbType == 'mongodb';
  }

  async run(object: T[] | T, options?: ISaveOptions): Promise<T[] | T> {
    _.defaults(options, {validate: false, raw: false})
    let isArray = _.isArray(object);

    this.objects = this.prepare(object);
    let objectsValid: boolean = true;
    if (_.get(options, 'validate', false)) {
      objectsValid = await this.validate();
    }

    if (objectsValid) {
      let resolveByEntityDef = TypeOrmUtils.resolveByEntityDef(this.objects);
      let entityNames = _.keys(resolveByEntityDef);
      this.c = await this.ec.storageRef.connect();

      if (this.isMongoDB()) {
        let promises = [];
        for (let entityName of entityNames) {
          let repo = this.c.manager.getMongoRepository(entityName);
          let entityDef = TypeOrmEntityRegistry.$().getEntityRefFor(entityName);
          let propertyDef = entityDef.getPropertyRefs().find(p => p.isIdentifier());

          if (options.raw) {
            let bulk = repo.initializeOrderedBulkOp();
            resolveByEntityDef[entityName].forEach((e: any) => {
              if (e._id) {
                bulk.find({_id: e._id}).replaceOne(e);
              } else {
                if (!e._id && propertyDef.name != '_id') {
                  _.set(e, '_id', _.get(e, propertyDef.name, null));
                }
                bulk.insert(e);
              }
            })
            await bulk.execute();


          } else {
            resolveByEntityDef[entityName].forEach((x: any) => {
              if (!x._id && propertyDef.name != '_id') {
                _.set(x, '_id', _.get(x, propertyDef.name, null));
              }
            });

            let p = repo.save(resolveByEntityDef[entityName]).then((x: any) => {
              resolveByEntityDef[entityName].forEach((x: any) => {
                if (!x._id && propertyDef.name != '_id') {
                  _.set(x, '_id', _.get(x, propertyDef.name, null));
                }
              });
            });
            promises.push(p);
          }
        }
        await Promise.all(promises);
      } else {
        // start transaction, got to leafs and save
        let results = await this.c.manager.transaction(async em => {
          let promises = [];
          for (let entityName of entityNames) {
            let p = em.getRepository(entityName).save(resolveByEntityDef[entityName]);
            promises.push(p);
          }
          return Promise.all(promises);
        });
      }

      await this.c.close();
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
    let valid: boolean = true;
    await Promise.all(_.map(this.objects, o => new DataContainer(o, TypeOrmEntityRegistry.$())).map(async c => {
      valid = valid && await c.validate();
      if (!this.isMongoDB()) {
        c.applyState();
      }
    }));
    return valid;
  }


}
