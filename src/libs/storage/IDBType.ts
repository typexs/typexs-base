import {JS_DATA_TYPES} from '@allgemein/schema-api';


export interface IDBType {
  type: any;
  sourceType: JS_DATA_TYPES | 'array';
  length?: number;
  variant?: string;
}
