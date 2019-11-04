import {BaseConnectionOptions} from 'typeorm/connection/BaseConnectionOptions';
import {StringOrFunction} from 'commons-base';


export const K_STORAGE = 'storage';


export interface IStorageOptions extends BaseConnectionOptions {

  baseClass?: StringOrFunction;

  /**
   * Connect on startup to check or create entities in tables
   */
  connectOnStartup: boolean;

  /**
   * Name or names of storages hows entities will be added
   */
  extends?: string | string[];

}
