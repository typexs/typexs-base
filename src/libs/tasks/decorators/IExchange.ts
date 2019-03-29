import {JS_DATA_TYPES} from "commons-schema-api/browser";


export interface IExchange {
  name?: string;
  optional?: boolean;
  handle?: (x: any) => any;
  type?: JS_DATA_TYPES | Function
  caridnality?: number
}
