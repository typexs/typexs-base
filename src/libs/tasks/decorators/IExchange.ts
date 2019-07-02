import {JS_DATA_TYPES} from 'commons-schema-api/browser';

/**
 * Options describing incoming/outgoing parameters
 */
export interface IExchange {

  /**
   * Other name then given propertyName to lookup parameter value in passed parameter object
   */
  name?: string;

  /**
   * Describes if the parameter optional
   */
  optional?: boolean;

  handle?: (x: any) => any;

  type?: JS_DATA_TYPES | Function;

  caridnality?: number;

}
