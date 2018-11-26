import * as _ from 'lodash';
import {CryptUtils} from "./libs/utils/CryptUtils";
import {Log} from "./libs/logging/Log";
import {IOptions} from "commons-config";
import {RuntimeLoader} from "./base/RuntimeLoader";
import {IRuntimeLoaderOptions} from "./base/IRuntimeLoaderOptions";
import {IActivator} from "./api/IActivator";
import {Config} from "commons-config/config/Config";
import {IModule} from "./api/IModule";

import {IStorageOptions, K_STORAGE} from "./libs/storage/IStorageOptions";
import {DEFAULT_STORAGE_OPTIONS, Storage} from "./libs/storage/Storage";
import {Container} from "typedi";

import {getMetadataArgsStorage, useContainer} from "typeorm";
import {BaseUtils} from "./libs/utils/BaseUtils";
import {PlatformUtils} from "commons-base";
import {CONFIG_NAMESPACE, K_CLS_ACTIVATOR, K_CLS_BOOTSTRAP, K_CLS_STORAGE_SCHEMAHANDLER} from "./types";
import {IConfigOptions} from "commons-config/config/IConfigOptions";
import {IBootstrap} from "./api/IBootstrap";
import {ClassesLoader} from "commons-moduls";
import {ITypexsOptions} from "./libs/ITypexsOptions";

useContainer(Container);


const DEFAULT_CONFIG_LOAD_ORDER = [
  {type: 'file', file: '${argv.configfile}'},
  {type: 'file', file: '${env.configfile}'},
  {
    type: 'file',
    file: {dirname: './config', filename: 'typexs'},
    namespace: CONFIG_NAMESPACE,
    pattern: [
      'typexs--${os.hostname}'
    ]
  },
  {
    type: 'file',
    file: {dirname: './config', filename: '${app.name}'},
    pattern: [
      'secrets',
      '${app.name}--${os.hostname}',
      '${app.name}--${env.stage}',
      '${app.name}--${argv.stage}',
      '${app.name}--${os.hostname}--${argv.stage}',
      '${app.name}--${os.hostname}--${env.stage}'
    ]
  }
];


export const DEFAULT_RUNTIME_OPTIONS: IRuntimeLoaderOptions = {

  appdir: '.',

  paths: [],

  included: {},

  subModulPattern: [
    'packages',
    'src/packages'
  ],

  libs: [
    {
      topic: K_CLS_ACTIVATOR,
      refs: ['Activator', 'src/Activator']
    },
    {
      topic: K_CLS_BOOTSTRAP,
      refs: ['Bootstrap', 'src/Bootstrap']
    },
    {
      topic: 'commands',
      refs: ['commands', 'src/commands']
    },
    {
      topic: 'generators',
      refs: ['generators', 'src/generators']
    },
    {
      topic: K_CLS_STORAGE_SCHEMAHANDLER,
      refs: [
        "adapters/storage/*/*SchemaHandler.*",
        "src/adapters/storage/*/*SchemaHandler.*"
      ]
    },
    {
      topic: 'entity.default',
      refs: [
        'entities', 'src/entities',
        'shared/entities', 'src/shared/entities',
        'modules/*/entities', 'src/modules/*/entities'
      ]
    },
  ]
};


const DEFAULT_OPTIONS: ITypexsOptions = {
  app: {
    name: 'app',
    path: '.'
  },

  modules: DEFAULT_RUNTIME_OPTIONS,

  logging: {enable: false, events: false},

  storage: {
    'default': DEFAULT_STORAGE_OPTIONS
  }
};


export class Bootstrap {

  private static nodeId: string = CryptUtils.shorthash(CryptUtils.random(8));

  private static $self: Bootstrap = null;

  private CONFIG_LOADED: boolean = false;

  private cfgOptions: IOptions = {};

  private VERBOSE_DONE: boolean = false;

  private runtimeLoader: RuntimeLoader = null;

  private activators: IActivator[] = null;

  private bootstraps: IBootstrap[] = null;


  private storage: Storage;

  private _options: ITypexsOptions;


  private constructor(options: ITypexsOptions = {}) {
    this._options = _.defaults(options, _.cloneDeep(DEFAULT_OPTIONS));
    let config_load_order = _.cloneDeep(DEFAULT_CONFIG_LOAD_ORDER);
    this.setConfigSources(config_load_order);

  }


  static _(options: ITypexsOptions = {}): Bootstrap {
    if (!this.$self) {
      this.$self = new Bootstrap(options);
    }
    return this.$self
  }


  static reset() {
    this.$self = null;
    Container.reset();
  }


  activateLogger(): Bootstrap {
    Log.prefix = Bootstrap.nodeId + ' ';
    Log.options(this._options.logging || {enable: false});
    return this;
  }


  activateErrorHandling(): Bootstrap {
    process.on('unhandledRejection', this.throwedUnhandledRejection.bind(this));
    process.on('uncaughtException', this.throwedUncaughtException.bind(this));
    process.on('warning', Log.warn.bind(Log));
    return this;
  }


  async activateStorage(): Promise<Bootstrap> {
    this.storage = new Storage();
    this.storage.nodeId = Bootstrap.nodeId;
    await this.storage.prepare(this.runtimeLoader);

    Bootstrap.getContainer().set(Storage, this.storage);
    Bootstrap.getContainer().set(Storage.NAME, this.storage);
    Bootstrap.getContainer().set(K_STORAGE, this.storage);

    let o_storage: { [name: string]: IStorageOptions } = Config.get(K_STORAGE, CONFIG_NAMESPACE, {});

    for (let name in o_storage) {
      let settings = o_storage[name];
      let entities: Function[] = [];
      if (this.runtimeLoader) {
        let _entities: Function[] = this.runtimeLoader.getClasses(['entity', name].join('.'));
        // Check if classes are realy for typeorm
        entities = <Function[]>getMetadataArgsStorage().tables
          .filter(t => _entities.indexOf(<Function>t.target) != -1)
          .map(t => t.target);
      }

      let _settings: IStorageOptions = _.merge(settings, {entities: entities}, {name: name});
      Log.debug('storage register ' + name + ' with ' + entities.length + ' entities');
      let storageRef = this.storage.register(name, _settings);
      await storageRef.prepare();
      Bootstrap.getContainer().set([K_STORAGE, name].join('.'), storageRef);
    }
    return this;
  }


  throwedUnhandledRejection(reason: any, err: Error) {
    Log.error('unhandledRejection', reason, err)
  }


  throwedUncaughtException(err: Error) {
    Log.error('uncaughtException', err)
  }


  static verbose(c: any) {
    if (this._().VERBOSE_DONE) return;
    this._().VERBOSE_DONE = true;
    if (c === true) {
      Log.options({
        enable: true,
        level: 'debug',
        transports: [{
          console: {
            name: 'stderr',
            defaultFormatter: true,
            stderrLevels: ['info', 'debug', 'error', 'warn']
          }
        }]
      }, true)
    }
  }


  static addConfigOptions(options: IOptions) {
    let opts = this._().cfgOptions;
    this._().cfgOptions = BaseUtils.merge(opts, options);
    return this._().cfgOptions;
  }


  static getContainer() {
    return Container;
  }


  static configure(options: ITypexsOptions = {}): Bootstrap {
    return this._(options).configure()
  }


  setConfigSources(sources: IConfigOptions[]) {
    this.cfgOptions.configs = sources;
    return this;
  }


  static setConfigSources(sources: IConfigOptions[]) {
    return this._().setConfigSources(sources);
  }


  configure(c: any = null) {
    if (this.CONFIG_LOADED) {
      Log.warn('already configured');
      return this;
    }
    this.CONFIG_LOADED = true;

    if (this._options.app.path) {
      this.cfgOptions.workdir = this._options.app.path;
    }

    // check if it is an file
    try {
      let additionalData = null;

      if (_.isString(c)) {
        // can be file or JSON with config
        try {
          additionalData = JSON.parse(c);
        } catch (e) {

          let configfile: string = null;

          if (PlatformUtils.isAbsolute(c)) {
            configfile = PlatformUtils.pathNormalize(c);
          } else {
            configfile = PlatformUtils.pathResolveAndNormalize(c);
          }

          if (PlatformUtils.fileExist(configfile)) {
            this.cfgOptions.configs.push({type: 'file', file: configfile});
          } else {
            // INFO that file couldn't be loaded, because it doesn't exist
          }
        }
      } else if (_.isObject(c)) {
        additionalData = c;
      }

      this.cfgOptions = Config.options(this.cfgOptions);

      if (_.isObject(additionalData)) {
        Config.jar(CONFIG_NAMESPACE).merge(additionalData);
      }

      this.cfgOptions.configs.forEach(_c => {
        if (_c.state && _c.type != 'system') {
          Log.info('Loaded configuration from ' + (_.isString(_c.file) ? _c.file : _c.file.dirname + '/' + _c.file.filename));
        }
      })

    } catch (err) {
      Log.error(err);
      process.exit(1)
    }

    this._options = BaseUtils.merge(this._options, Config.jar(CONFIG_NAMESPACE).get(''));
    Config.jar(CONFIG_NAMESPACE).merge(this._options);
    // this._options = Config.jar(CONFIG_NAMESPACE).get('');
    return this;
  }


  async prepareRuntime(): Promise<Bootstrap> {
    this._options.modules.appdir = this._options.app.path;
    this.runtimeLoader = new RuntimeLoader(this._options.modules);
    Bootstrap.getContainer().set(RuntimeLoader, this.runtimeLoader);
    Bootstrap.getContainer().set(RuntimeLoader.NAME, this.runtimeLoader);
    await this.runtimeLoader.prepare();
    // update config
    Config.jar(CONFIG_NAMESPACE).set('modules', this.runtimeLoader._options);
    return this;
  }


  private configureModules() {
    // execute static method config on Activators if it exists
  }


  private createActivatorInstances() {
    let classes = this.runtimeLoader.getClasses(K_CLS_ACTIVATOR);
    this.activators = [];
    // todo before create injector and pass as parameter
    for (let clz of classes) {
      this.activators.push(Bootstrap.getContainer().get(clz));
    }
    return this.activators;
  }


  private createBootstrapInstances() {
    let classes = this.runtimeLoader.getClasses(K_CLS_BOOTSTRAP);
    this.bootstraps = [];
    // todo before create injector and pass as parameter
    for (let clz of classes) {
      this.bootstraps.push(Bootstrap.getContainer().get(clz));
    }
    return this.bootstraps;
  }


  async startup(): Promise<Bootstrap> {
    Log.debug('startup ...');

    let activators = this.getActivators();
    activators = _.filter(activators, a => _.isFunction(a['startup']));
    for (let activator of activators) {
      Log.debug('activate ' + ClassesLoader.getModulName(activator.constructor));
      await activator.startup();
    }

    // TODO how to handle dependencies?
    let bootstraps = this.getModulBootstraps();
    bootstraps = _.filter(bootstraps, a => _.isFunction(a['bootstrap']));
    for (let bootstrap of bootstraps) {
      Log.debug('bootstrap ' + ClassesLoader.getModulName(bootstrap.constructor));
      await bootstrap.bootstrap();
    }

    Log.debug('startup finished.');
    return this;
  }


  getActivators(): IActivator[] {
    if (!this.activators) {
      return this.createActivatorInstances();
    }
    return this.activators;
  }

  getModulBootstraps(): IBootstrap[] {
    if (!this.bootstraps) {
      return this.createBootstrapInstances();
    }
    return this.bootstraps;
  }


  getCommands() {
    let commands = [];
    for (let clz of this.runtimeLoader.getClasses('commands')) {
      commands.push(Bootstrap.getContainer().get(clz));
    }
    return commands;
  }


  getAppPath() {
    return this._options.app.path
  }


  getModules(): IModule[] {
    let regModules = this.getLoader().registry.modules();
    let modules: IModule[] = [];
    for (let _module of regModules) {
      let moduleInfo: IModule = _module;
      moduleInfo.settings = this.runtimeLoader.getSettings(_module.name);
      moduleInfo.enabled = this.runtimeLoader.disabledModuleNames.indexOf(_module.name) === -1;
      modules.push(moduleInfo);
    }

    return modules;
  }


  getLoader(): RuntimeLoader {
    return this.runtimeLoader;
  }


  getStorage() {
    return this.storage;
  }


}
