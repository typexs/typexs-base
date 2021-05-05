import {ClassType} from '@allgemein/schema-api';
import {IValueProvider} from './IValueProvider';
import {ITaskPropertyRefOptions} from '../ITaskPropertyRefOptions';

export interface IIncomingOptions extends ITaskPropertyRefOptions {

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
