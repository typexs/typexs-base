import {IExchange} from './IExchange';
import {ClassType} from 'commons-schema-api';
import {IValueProvider} from './IValueProvider';

export interface IIncomingOptions extends IExchange {

  valueProvider?: any | any[] | ClassType<IValueProvider<any>>;

  /**
   * Validate values 
   *
   * @param value
   */
  valueValidator?: (value: any) => boolean;

}
