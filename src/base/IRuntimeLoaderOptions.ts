import {IClassesLib} from "commons-moduls";

export interface IRuntimeLoaderOptions {

  appdir?: string

  paths?: string[]

  disabled?: string[]

  libs?: IClassesLib[]

}
