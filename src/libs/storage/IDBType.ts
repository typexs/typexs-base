import {JS_DATA_TYPES} from 'commons-schema-api/browser';


export interface IDBType {
  type: any;
  sourceType: JS_DATA_TYPES | 'array';
  length?: number;
  variant?: string;
}
