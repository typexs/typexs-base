import {IRuntimeLoaderOptions} from '../base/IRuntimeLoaderOptions';
import {ILoggerOptions} from './logging/ILoggerOptions';
import {IStorageOptions} from './storage/IStorageOptions';
import {ICacheConfig} from './cache/ICacheConfig';

export interface ITypexsOptions {
  app?: {
    name?: string
    path?: string
  };

  modules?: IRuntimeLoaderOptions;

  logging?: ILoggerOptions;

  storage?: { [name: string]: IStorageOptions };

  cache?: ICacheConfig;
}
