import {IClassRef} from "../../../../schema_api/IClassRef";
import {TypeOrmPropertyDef} from "./TypeOrmPropertyDef";
import {TableMetadataArgs} from "typeorm/browser/metadata-args/TableMetadataArgs";
import * as _ from "lodash";
import {getMetadataArgsStorage} from "typeorm";
import {ClassUtils} from "../../../../utils/ClassUtils";



export class TypeOrmClassRef implements IClassRef {

  metadata: TableMetadataArgs;

  private _properties: TypeOrmPropertyDef[] = null;

  constructor(metadata: TableMetadataArgs) {
    this.metadata = metadata;

  }



  getPropertyDef(name: string): TypeOrmPropertyDef {
    return this.getPropertyDefs().find(p => p.name == name);
  }


  getPropertyDefs(): TypeOrmPropertyDef[] {
    if (!this._properties) {
      this._properties = _.concat(
        _.map(getMetadataArgsStorage().columns
            .filter(c => c.target == this.metadata.target),
          c => new TypeOrmPropertyDef(c, 'column')),
        _.map(getMetadataArgsStorage().filterRelations(this.metadata.target),
          c => new TypeOrmPropertyDef(c, 'relation')),
      );
    }
    return this._properties;
  }

  get storingName() {
    return this.metadata.name ? this.metadata.name : this.name.toLowerCase();
  }
  get name(){
    return ClassUtils.getClassName(this.metadata.target);
  }

}
