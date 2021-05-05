import {ILoggerApi as _ILoggerApi} from '@allgemein/base';
import {ILoggerOptions} from './ILoggerOptions';


export interface ILoggerApi extends _ILoggerApi {

  /**
   * Name of the logger
   */
  name: string;

  build?(name: string, options: ILoggerOptions, append?: boolean): ILoggerApi;

  getOptions(): ILoggerOptions;

  close(): void;

  clear(): void;

  tail?(entries: number): any[];

  remove(): void;

  createChildLogger?(options: ILoggerOptions): ILoggerApi;

  removeChildLogger?(name: string): void;
}
