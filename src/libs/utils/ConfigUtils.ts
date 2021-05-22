import {Config} from '@allgemein/config';
import * as _ from 'lodash';
import {TreeUtils} from '@allgemein/base';
import {ClassLoader} from '@allgemein/base';
import {C_CONFIG, C_CONFIG_FILTER_KEYS, C_CONFIGURATION_FILTER_KEYS_KEY, C_KEY_SEPARATOR} from '../Constants';
import {Cache} from '../../libs/cache/Cache';
import {Injector} from '../../libs/di/Injector';
import {WalkValues} from '@allgemein/base/utils/TreeUtils';
export class ConfigUtils {

  static getFilteredKeys(filterKeys: string[] = C_CONFIG_FILTER_KEYS) {
    return _.concat(filterKeys, Config.get(C_CONFIGURATION_FILTER_KEYS_KEY, []));
  }


  static clone(key: string = null, filterKeys: string[] = C_CONFIG_FILTER_KEYS) {
    filterKeys = this.getFilteredKeys(filterKeys);
    const _orgCfg = key ? Config.get(key) : Config.get();
    let cfg = _.cloneDeepWith(_orgCfg);
    if (!key && _.isArray(cfg)) {
      cfg = cfg.shift();
    }

    TreeUtils.walk(cfg, (x: WalkValues) => {
      // TODO make this list configurable! system.info.hide.keys!
      if (_.isString(x.key) && filterKeys.indexOf(x.key) !== -1) {
        delete x.parent[x.key];
      }
      if (_.isFunction(x.value)) {
        if (_.isArray(x.parent)) {
          x.parent[x.index] = ClassLoader.getClassName(x.value);
        } else {
          x.parent[x.key] = ClassLoader.getClassName(x.value);
        }
      }
    });
    return cfg;

  }


  static async getCached(nodeId: string, key: string = null) {
    const cache = Injector.get(Cache.NAME) as Cache;
    const config = await cache.get([C_CONFIG, nodeId].join(C_KEY_SEPARATOR))
    if (_.isEmpty(key)) {
      return config;
    }
    return _.get(config, key);

  }

}
