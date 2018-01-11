import * as _ from 'lodash';
import {ModuleRegistry} from "commons-moduls/registry/ModuleRegistry";
import {ClassesLoader, IClassesOptions, ISettingsOptions, SettingsLoader} from "commons-moduls";
import {IRuntimeLoaderOptions} from "./IRuntimeLoaderOptions";
import {Log} from "../";
import {DEFAULT_RUNTIME_OPTIONS, K_CLS_ACTIVATOR} from "../Bootstrap";


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
    this.registry = new ModuleRegistry({
      packageFilter: (json) => {
        return _.has(json, 'typexs')
      },
      module: module,
      paths: this._options.paths
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

    this.classesLoader = await this.registry.loader<ClassesLoader, IClassesOptions>(ClassesLoader, {libs: this._options.libs})
  }

  getClasses(topic: string) {
    return this.classesLoader.getClasses(topic);
  }


}
