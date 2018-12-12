import {JS_DATA_TYPES} from "../Constants";

export interface IDBType {
  type: string;
  sourceType: JS_DATA_TYPES;
  length?: number;
  variant?: string
}
