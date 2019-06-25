import {ILoggerApi as _ILoggerApi} from 'commons-base';
import {ILoggerOptions} from './ILoggerOptions';


export interface ILoggerApi extends _ILoggerApi {

  /**
   * Name of the logger
   */
  name: string;

  getOptions(): ILoggerOptions;

  close(): void;

  clear(): void;

  tail?(entries: number): any[];

  remove(): void;

  // getSubLogger()
}
