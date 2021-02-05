import {StringOrFunction} from '@allgemein/base';


export const K_STORAGE = 'storage';


export interface IStorageOptions {

  /**
   * name of this storage
   */
  readonly name?: string;

  /**
   * framework of storage
   */
  framework?: string;

  baseClass?: StringOrFunction;

  /**
   * Connect on startup to check or create entities in tables
   */
  connectOnStartup: boolean;

  /**
   * Name or names of storages hows entities will be added
   */
  extends?: string | string[];

  /**
   * Entities handled by this storage
   */
  readonly entities?: ((Function | any | string))[];
}
