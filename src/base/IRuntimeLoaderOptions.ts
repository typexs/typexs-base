import {IClassesLib} from '@allgemein/moduls/loader/classes/IClassesOptions';


export interface IRuntimeLoaderOptions {

  /**
   * declare the app path and where to lookup modules
   */
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
   * Minimatch include definitions for module paths.
   */
  include?: string[];

  /**
   * Minimatch include definitions for module paths.
   */
  exclude?: string[];

  /**
   * Filter modules which have 'typexs' and here defined keys in package.json definition
   */
  packageKeys?: string[];

  /**
   * Declare disabled modules
   */
  disabled?: string[];

  /**
   * Declare contextualised file lookups
   */
  libs?: IClassesLib[];

  /**
   * Lists included modules
   */
  included?: { [modulName: string]: { enabled?: boolean } };

  /**
   * Lists modules with enable or disable possibilty and additional parameters if needed
   *
   * modules:
   *   match:
   *     - name: module*
   *       enabled: false
   */
  match?: { name: string, enabled?: boolean, params?: any, match?: any }[];

  /**
   * Modulcache
   */
  cachePath?: string;

  /**
   * Disable cache
   */
  disableCache?: boolean;
}
