import {JS_DATA_TYPES} from "commons-schema-api/browser";


export interface IDBType {
  type: string;
  sourceType: JS_DATA_TYPES;
  length?: number;
  variant?: string
}
