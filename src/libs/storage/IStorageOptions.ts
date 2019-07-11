import {BaseConnectionOptions} from 'typeorm/connection/BaseConnectionOptions';
import {StringOrFunction} from 'commons-base';


export const K_STORAGE = 'storage';


export interface IStorageOptions extends BaseConnectionOptions {

  baseClass?: StringOrFunction;

  connectOnStartup: boolean;

}
