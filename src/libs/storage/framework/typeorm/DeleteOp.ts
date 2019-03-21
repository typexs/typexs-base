import * as _ from "lodash";

import {IDeleteOp} from "../IDeleteOp";
import {StorageEntityController} from "../../StorageEntityController";
import {NotYetImplementedError} from "commons-base/browser";
import {TypeOrmUtils} from "./TypeOrmUtils";
import {ConnectionWrapper} from "../../ConnectionWrapper";


export class DeleteOp<T> implements IDeleteOp<T> {
  readonly controller: StorageEntityController;

  private connection: ConnectionWrapper;

  private objects: any[] = [];

  constructor(controller: StorageEntityController) {
    this.controller = controller;
  }

  private isMongoDB() {
    return this.controller.storageRef.dbType == 'mongodb';
  }


  async run(object: T[] | T): Promise<T[] | T> {
    const isArray = _.isArray(object);

    this.objects = this.prepare(object);

    let resolveByEntityDef = TypeOrmUtils.resolveByEntityDef(this.objects);
    let entityNames = _.keys(resolveByEntityDef);
    this.connection = await this.controller.storageRef.connect();

    if(this.isMongoDB()){
      let promises = [];
      for (let entityName of entityNames) {
        let p = this.connection.manager.getMongoRepository(entityName).remove(resolveByEntityDef[entityName]);
        promises.push(p);
      }
      await Promise.all(promises);
    }else{
      // start transaction, got to leafs and save
      await this.connection.manager.transaction(async em => {
        let promises = [];
        for (let entityName of entityNames) {
          let p = em.getRepository(entityName).remove(resolveByEntityDef[entityName]);
          promises.push(p);
        }
        return Promise.all(promises);
      });
    }

    await this.connection.close();

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
