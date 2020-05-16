import {ClassRef} from 'commons-schema-api/browser';
import {REGISTRY_TYPEORM} from './schema/TypeOrmConstants';



export function classRefGet(klass: string | Function) {
  return ClassRef.get(klass, REGISTRY_TYPEORM);
}
