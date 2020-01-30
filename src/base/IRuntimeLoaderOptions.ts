import {IClassesLib} from 'commons-moduls';

export interface IRuntimeLoaderOptions {

  appdir?: string;

  /**
   * Paths from which the modules are search, default is the application root
   */
  paths?: string[];

  /**
   * Lookup directory pattern for included submodules. (Default: 'node_modules')
   */
  subModulPattern?: string[];

  /**
   * Filter modules which have 'typexs' and here defined keys in package.json definition
   */
  packageKeys?: string[];

  disabled?: string[];

  libs?: IClassesLib[];

  /**
   * Lists included modules
   */
  included?: { [modulName: string]: { enabled?: boolean } };

  /**
   * Lists modules with enable or disable possibilty and additional parameters if needed
   *
   * modules:
   *   access:
   *     - name: module*
   *       enabled: false
   */
  match?: { name: string, enabled?: boolean, params?: any, match?: any }[];

}
