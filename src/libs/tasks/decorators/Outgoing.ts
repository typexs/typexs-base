import {MetaArgs} from '@allgemein/base';
import {K_CLS_TASK_DESCRIPTORS} from '../Constants';
import {ITaskPropertyRefOptions} from '../ITaskPropertyRefOptions';
import {IOutgoingOptions} from './IOutgoingOptions';
import {assign, isFunction, isObjectLike} from 'lodash';
import {ClassRef, JS_PRIMATIVE_TYPES, REFLECT_DESIGN_TYPE, T_STRING} from '@allgemein/schema-api';


export function Outgoing(options: IOutgoingOptions = {}) {
  return function (source: any, propertyName: string) {

    const pOptions: ITaskPropertyRefOptions = {
      type: undefined
    };

    if (options && isObjectLike(options)) {
      assign(pOptions, options);
      if (pOptions.type && isFunction(pOptions.type)) {
        const name = ClassRef.getClassName(pOptions.type);
        if ([Function.name, '', 'type'].includes(name)) {
          pOptions.type = pOptions.type();
        }
      }
    }

    pOptions.target = source.constructor;
    pOptions.propertyName = propertyName;
    pOptions.propertyType = 'outgoing';

    if (!options.type) {
      const reflectMetadataType = Reflect && Reflect.getMetadata ?
        Reflect.getMetadata(REFLECT_DESIGN_TYPE, source, propertyName) : undefined;
      if (reflectMetadataType) {
        const className = ClassRef.getClassName(reflectMetadataType);
        if (JS_PRIMATIVE_TYPES.includes(className.toLowerCase() as any)) {
          pOptions.type = className.toLowerCase();
        } else if (className === Array.name) {
          pOptions.type = 'object';
          pOptions.cardinality = 0;
        } else {
          pOptions.type = reflectMetadataType;
        }
      } else {
        pOptions.type = T_STRING;
      }
    }


    MetaArgs.key(K_CLS_TASK_DESCRIPTORS).push(pOptions);
  };
}
