import {clone, cloneDeep, isArray, isString} from 'lodash';
import {DEFAULT_CONFIG_LOAD_ORDER, ENV_CONFIG_LOAD_KEY} from './Constants';
import {IConfigOptions} from '@allgemein/config';
import {FileUtils, PlatformUtils} from '@allgemein/base';


/**
 * Check if config file load order is present. Possible passthrough of the config order is:
 * - env variable
 *   - with data as string
 *   - with data as file
 * - load config order json file fi exists
 *   - like config-load.json oder ./config/config-load.json
 * - use at least DEFAULT_CONFIG_LOAD_ORDER
 */
export class ConfigLoadOrder {

  static FILENAMES = [
    'config-load.json'
  ];

  loadOrder: IConfigOptions[];

  constructor() {
    this.loadOrder = [];
  }

  /**
   * Apply default value at the end.
   */
  private applyDefault() {
    this.loadOrder = cloneDeep(DEFAULT_CONFIG_LOAD_ORDER);
    return true;
  }

  /**
   * Check all possibilities for load order
   */
  detect() {
    const fns = [
      this.checkEnvForLoadOrderDeclaration.bind(this),
      this.checkForConfigOrderFiles.bind(this),
      this.applyDefault.bind(this),
    ];
    let found = false;
    for (const fn of fns) {
      found = fn();
      if (found) {
        break;
      }
    }
    return found;
  }

  /**
   * Check if declaration of config load in env variable is present,
   * if it is set it could be the full declaration data as JSON or file path.
   */
  private checkEnvForLoadOrderDeclaration() {
    let ret = false;
    try {
      let value = PlatformUtils.getEnvVariable(ENV_CONFIG_LOAD_KEY);
      if (value) {
        if (isString(value)) {
          if (/.*\.json$/.test(value)) {
            ConfigLoadOrder.FILENAMES.push(value);
            throw new Error('not an array');
          } else {
            value = JSON.parse(value);
          }
        }

        if (!isArray(value)) {
          throw new Error('not an array');
        }
        this.loadOrder = value;
        ret = true;
      }
    } catch (e) {
      ret = false;
    }
    return ret;
  }

  /**
   * Check if files defined in ConfigLoadOrder.FILENAMES exists, the first which exists and contain the config order data, will be loaded.
   *
   * @private
   */
  private checkForConfigOrderFiles() {
    let ret = false;
    try {
      const checkFilenames = clone(ConfigLoadOrder.FILENAMES);
      // search also in config directory if exists
      ConfigLoadOrder.FILENAMES.forEach(x => {
        checkFilenames.push(PlatformUtils.join('config', x));
      });

      for (const f of checkFilenames) {
        let fileName = f;
        if (!PlatformUtils.isAbsolute(f)) {
          fileName = PlatformUtils.pathResolveAndNormalize(f);
        }
        if (!PlatformUtils.fileExist(fileName)) {
          continue;
        }
        const value = FileUtils.getJsonSync(fileName);
        if (isArray(value)) {
          this.loadOrder = value;
          ret = true;
          break;
        }
      }
    } catch (e) {
      ret = false;
    }
    return ret;

  }

  /**
   * Return defined load order.
   */
  get() {
    return this.loadOrder;
  }

}
