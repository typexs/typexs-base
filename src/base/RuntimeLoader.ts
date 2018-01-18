import * as _ from 'lodash';
import {ModuleRegistry} from "commons-moduls/registry/ModuleRegistry";
import {ClassesLoader, IClassesOptions, ISettingsOptions, SettingsLoader} from "commons-moduls";
import {IRuntimeLoaderOptions} from "./IRuntimeLoaderOptions";

import {DEFAULT_RUNTIME_OPTIONS, K_CLS_ACTIVATOR} from "../Bootstrap";
import {TYPEXS_NAME} from "../types";
import {PlatformUtils} from "commons-base";
import {Log} from "./../libs/logging/Log";


export class RuntimeLoader {

  _options: IRuntimeLoaderOptions;

  registry: ModuleRegistry;

  settings: { [moduleName: string]: any };

  classesLoader: ClassesLoader;


  constructor(options: IRuntimeLoaderOptions) {
    _.defaults(options, _.cloneDeep(DEFAULT_RUNTIME_OPTIONS));
    this._options = options;
    if (this._options.appdir && this._options.paths.indexOf(this._options.appdir) === -1) {
      this._options.paths.unshift(this._options.appdir);
    }
  }


  async prepare() {
    await this.rebuild()
  }


  async rebuild() {
    let modulePackageJsonKeys = [TYPEXS_NAME];
    if (this._options.packageKeys) {
      modulePackageJsonKeys = modulePackageJsonKeys.concat(this._options.packageKeys);
    }

    let modulPaths = [];
    for (let _path of this._options.paths) {
      if (PlatformUtils.fileExist(_path)) {
        modulPaths.push(_path);
      } else {
        Log.debug('skipping modul path ' + _path + ', because it does not exists.');
      }
    }

    this.registry = new ModuleRegistry({
      packageFilter: (json: any) => {
        return _.intersection(Object.keys(json), modulePackageJsonKeys).length > 0;
      },
      module: module,
      paths: modulPaths
    });
    await this.registry.rebuild();


    let settingsLoader = await this.registry.loader<SettingsLoader, ISettingsOptions>(SettingsLoader, {
      ref: 'package.json',
      path: 'typexs'
    });

    this.settings = settingsLoader.getSettings();
    // todo enable all, check against storage

    for (let moduleName in this.settings) {
      Log.debug('Load settings from module ' + moduleName);
      let modulSettings = this.settings[moduleName];
      if (_.has(modulSettings, 'declareLibs')) {
        for (let s of modulSettings['declareLibs']) {
          this._options.libs.push(s);
        }
      }
    }

    this._options.libs = _.sortBy(this._options.libs, ['topic']);
    this.classesLoader = await this.registry.createClassesLoader({libs: this._options.libs});
  }


  async getSettings(key: string) {
    let settingsLoader = await this.registry.createSettingsLoader({
      ref: 'package.json',
      path: key
    });
    return settingsLoader.getSettings();
  }


  getClasses(topic: string) {
    return this.classesLoader.getClasses(topic);
  }


}
