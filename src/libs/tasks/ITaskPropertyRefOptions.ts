import {IPropertyOptions, JS_DATA_TYPES} from '@allgemein/schema-api';

export interface ITaskPropertyRefOptions extends IPropertyOptions{


  /**
   * Property propertyType
   */
  propertyType?: 'incoming' | 'outgoing' | 'runtime';


  /**
   * Other name then given propertyName to lookup parameter value in passed parameter object
   */
  name?: string;

  /**
   * Describes if the parameter optional
   */
  optional?: boolean;

  /**
   * Define the default value for the property
   */
  default?: any;

  /**
   * Define the handle function which convert input to the expected
   */
  handle?: (x: any) => any;

  /**
   * Define propertyType if primative
   */
  type?: JS_DATA_TYPES | Function;

  /**
   * Define if multiple values are allowed
   */
  cardinality?: number;

}
