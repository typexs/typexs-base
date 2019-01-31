import {TypeOrmEntityDef} from "./schema/TypeOrmEntityDef";


export class TypeOrmUtils {
  static resolveByEntityDef<T>(objs: T[]) {
    let resolved: { [entityType: string]: T[] } = {};
    for (let obj of objs) {
      let entityName = TypeOrmEntityDef.resolveName(obj);
      if (!resolved[entityName]) {
        resolved[entityName] = [];
      }
      resolved[entityName].push(obj);

    }
    return resolved;
  }
}
