import * as _ from 'lodash';
import {ICache, IClassesLoader, IModuleRegistry, ModuleDescriptor, ModuleRegistry} from '@allgemein/moduls';
import {IRuntimeLoaderOptions} from './IRuntimeLoaderOptions';
import {TYPEXS_NAME} from '../libs/Constants';
import {CryptUtils, PlatformUtils} from '@allgemein/base';
import {Log} from './../libs/logging/Log';
import {MatchUtils} from '../libs/utils/MatchUtils';
import {ModulRegistryCache} from '../libs/cache/ModulRegistryCache';
import {IRuntimeLoader} from '../libs/core/IRuntimeLoader';
import {DEFAULT_RUNTIME_OPTIONS} from '../libs/config/Constants';


export class RuntimeLoader implements IRuntimeLoader {

  static NAME = 'RuntimeLoader';

  options: IRuntimeLoaderOptions;

  registry: IModuleRegistry;

  settings: { [moduleName: string]: any };

  classesLoader: IClassesLoader;

  cache: ICache;

  disabledModuleNames: string[] = [];

  disabledClassNames: string[] = [];


  constructor(options: IRuntimeLoaderOptions) {
    _.defaults(options, _.cloneDeep(DEFAULT_RUNTIME_OPTIONS));
    this.options = options;
    const appdir = this.options.appdir || PlatformUtils.pathResolve('.');

    const cacheDisable = _.get(options, 'disableCache', false);
    if (!cacheDisable) {
      this.cache = new ModulRegistryCache(
        this.options.cachePath ? this.options.cachePath : '/tmp/.txs/cache',
        CryptUtils.shorthash(JSON.stringify(this.options) + appdir)
      );
    }

    if (appdir && this.options.paths.indexOf(appdir) === -1) {
      this.options.paths.unshift(appdir);
    }

    this.options.paths = this.options.paths.map(p => {
      if (PlatformUtils.isAbsolute(p)) {
        return p;
      } else {
        return PlatformUtils.join(appdir, p);
      }
    });
  }


  async prepare() {
    await this.rebuild();
  }

  getOptions() {
    return this.options;
  }

  getRegistry() {
    return this.registry;
  }

  getDisabledModuleNames(): string[] {
    return this.disabledModuleNames;
  }

  async rebuild() {
    let modulePackageJsonKeys = [TYPEXS_NAME];
    if (this.options.packageKeys) {
      modulePackageJsonKeys = modulePackageJsonKeys.concat(this.options.packageKeys);
    }
    this.options.packageKeys = modulePackageJsonKeys;

    const modulPaths = [];
    for (const _path of this.options.paths) {
      if (PlatformUtils.fileExist(_path)) {
        modulPaths.push(_path);
      } else {
        Log.debug('skipping modul path ' + _path + ', because it does not exists.');
      }
    }

    // @ts-ignore
    this.registry = new ModuleRegistry({
      packageFilter: (json: any) => {
        return _.intersection(Object.keys(json), modulePackageJsonKeys).length > 0 && this.isEnabled(json.name);
      },
      module: module,
      paths: modulPaths,
      pattern: this.options.subModulPattern ? this.options.subModulPattern : [],
      cache: this.cache
    });

    await this.registry.rebuild();

    const settingsLoader = await this.registry.createSettingsLoader({
      ref: 'package.json',
      path: 'typexs'
    });

    this.settings = settingsLoader.getSettings();
    // todo enable all, check against storage


    for (const moduleName in this.settings) {
      if (!this.settings.hasOwnProperty(moduleName)) {
        continue;
      }
      if (!this.isIncluded(moduleName)) {
        this.includeModule(moduleName);
      }

      if (this.isEnabled(moduleName)) {
        Log.debug('Load settings from module ' + moduleName);
        const modulSettings = this.settings[moduleName];
        if (_.has(modulSettings, 'declareLibs')) {
          for (const s of modulSettings['declareLibs']) {
            const topicData = _.find(this.options.libs, (lib) => lib.topic === s.topic);
            if (topicData) {
              topicData.refs.push(...s.refs);
              topicData.refs = _.uniq(topicData.refs);
            } else {
              this.options.libs.push(s);
            }
          }
        }
      } else {
        this.disabledModuleNames.push(moduleName);
        Log.debug('Skip settings loading for module ' + moduleName);
      }
    }

    this.options.libs = _.sortBy(this.options.libs, ['topic']);
    this.classesLoader = await this.registry.createClassesLoader({libs: this.options.libs});
  }

  isIncluded(modulName: string) {
    return _.has(this.options.included, modulName);
  }

  includeModule(modulName: string) {
    return _.set(this.options.included, modulName, {enabled: true});
  }


  async getSettings(key: string): Promise<any> {
    const settingsLoader = await this.registry.createSettingsLoader({
      ref: 'package.json',
      path: key
    });
    if (settingsLoader) {
      const list = settingsLoader.getSettings();
      return list;
    }
    return {};
  }


  getModule(modulName: string): ModuleDescriptor {
    return this.registry.getModules().find(m => m.name === modulName);
  }


  getClasses(topic: string) {
    if (this.classesLoader) {
      return this.classesLoader.getClassesWithFilter(topic, ((className, modulName) =>
        this.disabledModuleNames.indexOf(modulName) !== -1 ||
        this.disabledClassNames.indexOf(className) !== -1));
    }
    return [];
  }

  isEnabled(name: string) {
    return this.isEnabledByMatch(name) && this.isEnabledByInclude(name);
  }


  isEnabledByInclude(modulName: string) {
    return _.get(this.options.included, modulName + '.enabled', true) === true;
  }


  isEnabledByMatch(name: string) {
    if (_.has(this.options, 'match')) {
      // if access empty then
      let allow = this.options.match.length > 0 ? false : true;
      let count = 0;
      for (const a of this.options.match) {
        if (_.isUndefined(a.match)) {
          if (/\+|\.|\(|\||\)|\*/.test(a.name)) {
            a.match = a.name;
          } else {
            a.match = false;
          }
        }
        if (_.isBoolean(a.match)) {
          if (a.name === name) {
            count++;
            allow = a.enabled;
            return allow;
          }
        } else {
          if (MatchUtils.miniMatch(a.match, name)) {
            allow = allow || a.enabled;
            count++;
          }
        }
      }
      // no allowed or denied
      if (count === 0) {
        allow = true;
      }
      return allow;
    }
    return true;
  }


  // async getSchematicsInfos(): Promise<ISchematicsInfo[]> {
  //   const infos: ISchematicsInfo[] = [];
  //   const schematics = await this.getSettings('schematics');
  //   for (const moduleName in schematics) {
  //     const schematic = schematics[moduleName];
  //     if (schematic) {
  //       const module = this.getModule(moduleName);
  //       const coll = await PlatformUtils.readFile(PlatformUtils.join(module.path, schematic));
  //       let collectionContent = {};
  //       if (coll) {
  //         try {
  //           collectionContent = JSON.parse(coll.toString('utf-8'));
  //         } catch (err) {
  //         }
  //       }
  //
  //       infos.push(<ISchematicsInfo>{
  //         name: moduleName,
  //         internal: module.internal,
  //         submodule: module.submodule,
  //         path: module.path,
  //         collectionSource: schematic,
  //         collection: collectionContent
  //       });
  //     }
  //   }
  //   return infos;
  // }


}
