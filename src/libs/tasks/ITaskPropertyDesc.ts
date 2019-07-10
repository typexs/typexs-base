import {IExchange} from './decorators/IExchange';

export interface ITaskPropertyDesc {
  /**
   * Property type
   */
  type: 'incoming' | 'outgoing' | 'runtime';

  /**
   * Class where property is present
   */
  target: Function;

  /**
   * Name of the property
   */
  propertyName: string;

  /**
   * Addtional option for the property
   */
  options?: IExchange;
}
