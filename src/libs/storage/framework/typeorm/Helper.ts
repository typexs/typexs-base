import {ClassRef, IEntityRef} from 'commons-schema-api/browser';
import {REGISTRY_TYPEORM} from './schema/TypeOrmConstants';
import {TypeOrmPropertyRef} from './schema/TypeOrmPropertyRef';
import * as _ from 'lodash';


export function classRefGet(klass: string | Function) {
  return ClassRef.get(klass, REGISTRY_TYPEORM);
}


export function convertPropertyValueJsonToString(entityRef: IEntityRef, entities: any[]) {
  const check = _.isArray(entities) ? entities : [entities];
  const structuredProps = entityRef.getPropertyRefs().filter((x: TypeOrmPropertyRef) => x.isStructuredType());
  for (const structuredProp of structuredProps) {
    for (const entity of check) {
      const value = entity[structuredProp.name];
      if (!_.isString(value)) {
        try {
          entity[structuredProp.name] = JSON.stringify(value);
        } catch (e) {
        }
      }
    }
  }
}

export function convertPropertyValueStringToJson(entityRef: IEntityRef, entities: any[]) {
  const check = _.isArray(entities) ? entities : [entities];
  const structuredProps = entityRef.getPropertyRefs().filter((x: TypeOrmPropertyRef) => x.isStructuredType());
  for (const structuredProp of structuredProps) {
    for (const entity of check) {
      const value = entity[structuredProp.name];
      if (_.isString(value)) {
        try {
          entity[structuredProp.name] = JSON.parse(value);
        } catch (e) {
        }
      }
    }
  }

}
