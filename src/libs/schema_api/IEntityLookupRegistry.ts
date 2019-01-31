import {IEntityDef} from "./IEntityDef";


export interface IEntityLookupRegistry {

  getEntityDefFor(fn: any): IEntityDef;
}
