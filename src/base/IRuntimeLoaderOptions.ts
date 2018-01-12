import {IClassesLib} from "commons-moduls";

export interface IRuntimeLoaderOptions {

  appdir?: string

  paths?: string[]

  /**
   * Filter modules which have 'typexs' and here defined keys in package.json definition
   */
  packageKeys?:string[]

  disabled?: string[]

  libs?: IClassesLib[]

}
