import {IExchange} from './IExchange';
import {ClassType} from 'commons-schema-api/browser';
import {IValueProvider} from './IValueProvider';

export interface IIncomingOptions extends IExchange {

  /**
   * Define an array or value provider which defines/provides the possible values
   */
  valueProvider?: any | any[] | ClassType<IValueProvider<any>>;

  /**
   * Validate values
   *
   * @param value
   */
  valueValidator?: (value: any) => boolean;

}
