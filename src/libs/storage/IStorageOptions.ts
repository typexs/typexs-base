



import {BaseConnectionOptions} from "typeorm/connection/BaseConnectionOptions";
import {StringOrFunction} from "../../types";


export const K_STORAGE:string = 'storage';


export interface IStorageOptions extends BaseConnectionOptions {

  baseClass?: StringOrFunction





}
