
import {TypeOrmEntityLookupRegistry} from "./TypeOrmEntityLookupRegistry";
import {TypeOrmClassRef} from "./TypeOrmClassRef";
import {IEntityDef} from "../../../../schema_api/IEntityDef";

export class TypeOrmEntityDef extends TypeOrmClassRef implements IEntityDef {


  static resolveName(instance: any): string {
    let xsdef: TypeOrmEntityDef = TypeOrmEntityLookupRegistry.$().getEntityDefFor(instance);
    if (xsdef) {
      return xsdef.name;
    } else {
      throw new Error('resolveName not found for instance: ' + JSON.stringify(instance));
    }

  }

  getClassRef(): TypeOrmClassRef {
    return this;
  }


}
