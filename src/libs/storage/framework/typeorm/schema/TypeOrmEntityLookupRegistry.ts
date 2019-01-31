import * as _ from 'lodash';

import {getMetadataArgsStorage} from "typeorm";
import {TypeOrmEntityDef} from "./TypeOrmEntityDef";
import {TableMetadataArgs} from "typeorm/browser/metadata-args/TableMetadataArgs";
import {IEntityLookupRegistry} from "../../../../schema_api/IEntityLookupRegistry";

export class TypeOrmEntityLookupRegistry implements IEntityLookupRegistry {

  private static _self: TypeOrmEntityLookupRegistry;

  private _cache: TypeOrmEntityDef[] = [];

  private constructor() {
  }


  static $() {
    if (!this._self) {
      this._self = new TypeOrmEntityLookupRegistry();
    }
    return this._self;
  }

  private findTable(f: (x: TableMetadataArgs) => boolean) {
    return getMetadataArgsStorage().tables.find(f);
  }



  getEntityDefFor(fn: any): TypeOrmEntityDef {
    let cName: TableMetadataArgs = null;
    if (_.isString(fn)) {
      cName = this.findTable(table => _.isString(table.target) ? table.target == fn : table.target.name == fn)
    } else if (_.isFunction(fn)) {
      cName = this.findTable(table => table.target == fn)
    } else if (_.isPlainObject(fn)) {
      cName = this.findTable(table => table.target == fn.prototype.constructor)
    } else if (_.isObjectLike(fn)) {
      let construct = fn.prototype ? fn.prototype.constructor : fn.__proto__.constructor;
      cName = this.findTable(table => table.target == construct)
    }
    if (!cName) {
      let s = getMetadataArgsStorage();
      throw new Error('no entity for ' + fn + ' found');
    }
    return new TypeOrmEntityDef(cName);


  }



}
