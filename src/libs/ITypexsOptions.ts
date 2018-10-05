import {IRuntimeLoaderOptions} from "../base/IRuntimeLoaderOptions";
import {ILoggerOptions} from "./logging/ILoggerOptions";
import {IStorageOptions} from "./storage/IStorageOptions";

export interface ITypexsOptions {
  app?: {
    name?: string
    path?: string
  }

  modules?: IRuntimeLoaderOptions

  logging?: ILoggerOptions

  storage?: { [name: string]: IStorageOptions }

}
