import {IEntityRef, IPropertyRef} from '@allgemein/schema-api';
import * as _ from 'lodash';
import {K_STRINGIFY_OPTION} from './Constants';

//
// export function classRefGet(klass: string | Function): IClassRef {
//   return ClassRef.get(klass, REGISTRY_TYPEORM);
// }


export function convertPropertyValueJsonToString(entityRef: IEntityRef, entities: any[]) {
  const check = _.isArray(entities) ? entities : [entities];
  const structuredProps = entityRef.getPropertyRefs()
    .filter(
      (x: IPropertyRef) =>
        x.getOptions(K_STRINGIFY_OPTION, false)
    );
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
  const structuredProps = entityRef.getPropertyRefs().filter(
    (x: IPropertyRef) =>
      x.getOptions(K_STRINGIFY_OPTION, false)
  );
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
