import * as _ from 'lodash';
import {CryptUtils} from './libs/utils/CryptUtils';
import {Log} from './libs/logging/Log';
import {IOptions} from 'commons-config';
import {RuntimeLoader} from './base/RuntimeLoader';
import {IRuntimeLoaderOptions} from './base/IRuntimeLoaderOptions';
import {IActivator} from './api/IActivator';
import {Config} from 'commons-config/config/Config';
import {IModule} from './api/IModule';

import {IStorageOptions, K_STORAGE} from './libs/storage/IStorageOptions';
import {Storage} from './libs/storage/Storage';
import {Container} from 'typedi';
import * as os from 'os';

import {getMetadataArgsStorage, useContainer} from 'typeorm';
import {BaseUtils} from './libs/utils/BaseUtils';
import {MetaArgs, PlatformUtils} from 'commons-base';
import {
  CONFIG_NAMESPACE,
  K_CLS_ACTIVATOR,
  K_CLS_API,
  K_CLS_BOOTSTRAP,
  K_CLS_CACHE_ADAPTER,
  K_CLS_COMMANDS,
  K_CLS_ENTITIES_DEFAULT,
  K_CLS_GENERATORS,
  K_CLS_SCHEDULE_ADAPTER_FACTORIES,
  K_CLS_STORAGE_SCHEMAHANDLER,
  K_CLS_USE_API
} from './libs/Constants';
import {IConfigOptions} from 'commons-config/config/IConfigOptions';
import {IBootstrap} from './api/IBootstrap';
import {ClassesLoader} from 'commons-moduls';
import {ITypexsOptions} from './libs/ITypexsOptions';
import {Invoker} from './base/Invoker';

import {IShutdown} from './api/IShutdown';
import {System} from './libs/system/System';
import {TableMetadataArgs} from 'typeorm/metadata-args/TableMetadataArgs';
import {K_CLS_WORKERS} from './libs/worker/Constants';
import {K_CLS_TASKS} from './libs/tasks/Constants';
import {SqliteConnectionOptions} from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import {ICommand} from './libs/commands/ICommand';
import {LockFactory} from './libs/LockFactory';

useContainer(Container);

/**
 * Search for config files
 * - first look for hostname specific files
 * - then for context specific controlled by startup arguments like 'nodeId' and 'stage'
 */
const DEFAULT_CONFIG_LOAD_ORDER = [
  {type: 'file', file: '${argv.configfile}'},
  {type: 'file', file: '${env.configfile}'},
  {
    type: 'file',
    file: {dirname: './config', filename: 'typexs'},
    namespace: CONFIG_NAMESPACE,
    pattern: [
      'typexs--${os.hostname}',
      'typexs--${argv.nodeId}',
      'typexs--${os.hostname}--${argv.nodeId}'
    ]
  },
  {
    type: 'file',
    file: {dirname: './config', filename: '${app.name}'},
    pattern: [
      'secrets',
      'secrets--${os.hostname}',
      'secrets--${argv.nodeId}',
      'secrets--${app.nodeId}',
      'secrets--${env.nodeId}',
      'secrets--${os.hostname}--${argv.nodeId}',
      'secrets--${os.hostname}--${app.nodeId}',
      'secrets--${os.hostname}--${env.nodeId}',
      '${app.name}--${os.hostname}',
      '${app.name}--${argv.nodeId}',
      '${app.name}--${app.nodeId}',
      '${app.name}--${env.stage}',
      '${app.name}--${argv.stage}',
      '${app.name}--${os.hostname}--${argv.stage}',
      '${app.name}--${os.hostname}--${env.stage}',
      '${app.name}--${os.hostname}--${argv.nodeId}',
      '${app.name}--${os.hostname}--${app.nodeId}',
      '${app.name}--${os.hostname}--${env.stage}--${argv.nodeId}',
      '${app.name}--${os.hostname}--${env.stage}--${app.nodeId}',
      '${app.name}--${os.hostname}--${argv.stage}--${argv.nodeId}',
      '${app.name}--${os.hostname}--${argv.stage}--${argv.nodeId}'
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
      refs: [
        'Activator', 'src/Activator'
      ]
    },
    {
      topic: K_CLS_BOOTSTRAP,
      refs: [
        'Bootstrap', 'src/Bootstrap',
        'Startup', 'src/Startup'
      ]
    },
    {
      topic: K_CLS_API,
      refs: [
        'api/*.api.*', 'src/api/*.api.*'
      ]
    },
    {
      topic: K_CLS_USE_API,
      refs: ['extend/*', 'src/extend/*']
    },
    {
      topic: K_CLS_COMMANDS,
      refs: ['commands', 'src/commands']
    },
    {
      topic: K_CLS_GENERATORS,
      refs: ['generators', 'src/generators']
    },
    {
      topic: K_CLS_STORAGE_SCHEMAHANDLER,
      refs: [
        'adapters/storage/*SchemaHandler.*',
        'src/adapters/storage/*SchemaHandler.*'
      ]
    },
    {
      topic: K_CLS_CACHE_ADAPTER,
      refs: [
        'adapters/cache/*CacheAdapter.*',
        'src/adapters/cache/*CacheAdapter.*'
      ]
    },
    {
      topic: K_CLS_SCHEDULE_ADAPTER_FACTORIES,
      refs: [
        'adapters/scheduler/*Factory.*',
        'src/adapters/scheduler/*Factory.*'
      ]
    },
    {
      topic: K_CLS_ENTITIES_DEFAULT,
      refs: [
        'entities', 'src/entities',
        'shared/entities', 'src/shared/entities',
        'modules/*/entities', 'src/modules/*/entities'
      ]
    },
    {
      topic: K_CLS_TASKS,
      refs: [
        'tasks', 'tasks/*/*', 'src/tasks', 'src/tasks/*/*'
      ]
    },
    {
      topic: K_CLS_WORKERS,
      refs: [
        'workers', 'workers/*/*', 'src/workers', 'src/workers/*/*'
      ]
    },
  ]
};


export const DEFAULT_STORAGE_OPTIONS: IStorageOptions = <SqliteConnectionOptions & IStorageOptions>{
  name: 'default',
  type: 'sqlite',
  database: ':memory:',
  synchronize: true,
  connectOnStartup: false
};

const DEFAULT_OPTIONS: ITypexsOptions = {
  app: {
    name: 'app',
    path: '.'
  },

  modules: DEFAULT_RUNTIME_OPTIONS,

  logging: {enable: false},

  storage: {
    'default': DEFAULT_STORAGE_OPTIONS
  }


};


export class Bootstrap {


  private constructor(options: ITypexsOptions = {}) {
    options = options || {};
    this._options = _.defaults(options, _.cloneDeep(DEFAULT_OPTIONS));
    const config_load_order = _.cloneDeep(DEFAULT_CONFIG_LOAD_ORDER);
    this.setConfigSources(config_load_order);
  }

  private static $self: Bootstrap = null;

  private nodeId: string = CryptUtils.shorthash(CryptUtils.random(8));

  private CONFIG_LOADED = false;

  private cfgOptions: IOptions = {};

  private VERBOSE_DONE = false;

  private runtimeLoader: RuntimeLoader = null;

  private activators: IActivator[] = null;

  private bootstraps: IBootstrap[] = null;

  private commands: ICommand[] = null;

  private storage: Storage;

  private _options: ITypexsOptions;

  private running = false;


  static _(options: ITypexsOptions = {}): Bootstrap {
    if (!this.$self) {
      this.$self = new Bootstrap(options);
    }
    return this.$self;
  }


  static reset() {
    this.$self = null;
    Container.reset();
    Log.reset();

  }

  static getNodeId() {
    return this._().nodeId;
  }


  static verbose(c: any) {
    if (this._().VERBOSE_DONE) {
      return;
    }
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
      }, true);
    }
  }


  static addConfigOptions(options: IOptions) {
    const opts = this._().cfgOptions;
    this._().cfgOptions = BaseUtils.merge(opts, options);
    return this._().cfgOptions;
  }


  static getContainer() {
    return Container;
  }


  static configure(options: ITypexsOptions = {}): Bootstrap {
    return this._(options).configure();
  }


  static setConfigSources(sources: IConfigOptions[]) {
    return this._().setConfigSources(sources);
  }


  static prepareInvoker(i: Invoker, loader: RuntimeLoader) {
    // lade klassen mit erweiterung, jedoch welche erweiterung implementieren diese
    const apiClasses = loader.getClasses(K_CLS_API);
    loader.getClasses(K_CLS_USE_API);
    const apis = MetaArgs.key(K_CLS_USE_API);
    apiClasses.forEach(api => {
      i.register(api, apis.filter(x => x.api === api).map(x => x.target));
    });
  }


  getNodeId() {
    return Bootstrap.getNodeId();
  }


  activateLogger(): Bootstrap {
    Log.prefix = this.getNodeId() + ' ';
    Log.options(this._options.logging || {enable: false});
    return this;
  }


  activateErrorHandling(): Bootstrap {
    process.on('unhandledRejection', this.throwedUnhandledRejection.bind(this));
    process.on('uncaughtException', this.throwedUncaughtException.bind(this));
    process.on('warning', Log.warn.bind(Log));
    process.setMaxListeners(1000);
    return this;
  }


  async activateStorage(): Promise<Bootstrap> {
    this.storage = new Storage();
    this.storage.nodeId = this.getNodeId();
    await this.storage.prepare(this.runtimeLoader);

    Bootstrap.getContainer().set(Storage, this.storage);
    Bootstrap.getContainer().set(Storage.NAME, this.storage);
    Bootstrap.getContainer().set(K_STORAGE, this.storage);

    const o_storage: { [name: string]: IStorageOptions } = Config.get(K_STORAGE, CONFIG_NAMESPACE, {});
    const storageNames = _.keys(o_storage);

    // ...

    const storageRefs = [];
    for (const name of storageNames) {
      const settings: any = o_storage[name];
      let entities: Function[] = [];
      if (this.runtimeLoader) {
        const _entities: Function[] = this.runtimeLoader.getClasses(['entity', name].join('.'));
        // Check if classes are realy for typeorm
        if (_.has(settings, 'extends')) {
          // if extends property is set
          let _extends = [];
          if (_.isString(settings.extends)) {
            _extends.push(settings.extends);
          } else {
            _extends = settings.extends;
          }

          _extends.forEach((x: string) => {
            const __entities = this.runtimeLoader.getClasses(['entity', x].join('.'));
            if (__entities.length > 0) {
              _entities.push(...__entities);
            }
          });
        }
        const tables: TableMetadataArgs[] = getMetadataArgsStorage().tables;
        entities = tables
          .filter(t => _entities.indexOf(<Function>t.target) !== -1)
          .map(t => <Function>t.target);
      }

      const _settings: IStorageOptions = _.merge(settings, {entities: entities}, {name: name});
      Log.debug('storage register ' + name + ' with ' + entities.length + ' entities');
      const storageRef = this.storage.register(name, _settings);
      if (storageRef.getOptions().connectOnStartup) {
        await storageRef.prepare();
      }
      storageRefs.push(storageRef);
      Bootstrap.getContainer().set([K_STORAGE, name].join('.'), storageRef);
    }

    for (const ref of storageRefs) {
      let _extended = [];
      const extended = ref.getOptions().extends;
      if (_.isString(extended)) {
        _extended.push(extended);
      } else {
        _extended = extended;
      }

      if (!_.isEmpty(_extended)) {
        for (const ext of _extended) {
          const extRef = this.storage.get(ext);
          extRef.addExtendedStorageRef(ref);
          ref.addExtendingStorageRef(extRef);
        }
      }


    }

    return this;
  }


  async throwedUnhandledRejection(reason: any, err: Error) {
    Log.error('unhandledRejection', reason, err);
  }


  throwedUncaughtException(err: Error) {
    Log.error('uncaughtException', err);
    if (Config.get('app.enableShutdownOnUncaughtException', false)) {
      return this.shutdown();
    }
    return Promise.resolve();
  }


  setConfigSources(sources: IConfigOptions[]) {
    this.cfgOptions.configs = sources;
    return this;
  }


  detectCommand() {
    const commands = this.getCommands(false).map(c => c.command);
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
        if (_c.state && _c.type !== 'system') {
          Log.debug('Loaded configuration from ' + (_.isString(_c.file) ? _c.file : _c.file.dirname + '/' + _c.file.filename));
        }
      });

    } catch (err) {
      Log.error(err);
      process.exit(1);
    }
    const add = Config.jar(CONFIG_NAMESPACE).get('');
    this._options = BaseUtils.merge(this._options, add);
    Config.jar(CONFIG_NAMESPACE).merge(this._options);

    /**
     * Override nodeId if given
     */

    const appNodeId = Config.get('app.nodeId', Config.get('argv.nodeId', null));
    this.nodeId = appNodeId ? appNodeId : this.nodeId;
    return this;
  }


  async prepareRuntime(): Promise<Bootstrap> {
    this._options.modules.appdir = this._options.app.path;
    this.runtimeLoader = new RuntimeLoader(this._options.modules);
    Bootstrap.getContainer().set(RuntimeLoader, this.runtimeLoader);
    Bootstrap.getContainer().set(RuntimeLoader.NAME, this.runtimeLoader);
    await this.runtimeLoader.prepare();

    const invoker = new Invoker();
    Bootstrap.getContainer().set(Invoker.NAME, invoker);
    Bootstrap.prepareInvoker(invoker, this.runtimeLoader);

    // update config
    Config.jar(CONFIG_NAMESPACE).set('modules', this.runtimeLoader._options);
    this.addShutdownEvents();
    return this;
  }


  private addShutdownEvents() {
    process.on('exit', async (code) => {
      await this.shutdown(code);
    });
    process.on('SIGINT', async () => {
      Log.info('Caught interrupt signal [SIGINT]');
      await this.shutdown();
      process.exit();
    });
    process.on('SIGTERM', async () => {
      Log.info('Caught interrupt signal [SIGTERM]');
      await this.shutdown();
      process.exit();
    });
  }


  private async createSystemInfo() {
    const system = Bootstrap.getContainer().get(System);
    await system.initialize(os.hostname(), this.getNodeId());
    Bootstrap.getContainer().set(System.NAME, system);
    // todo ip + command
    return this;
  }


  private createActivatorInstances() {
    const classes = this.runtimeLoader.getClasses(K_CLS_ACTIVATOR);
    this.activators = [];
    // todo before create injector and pass as parameter
    for (const clz of classes) {
      this.activators.push(Bootstrap.getContainer().get(clz));
    }
    return this.activators;
  }


  private createBootstrapInstances() {
    const classes = this.runtimeLoader.getClasses(K_CLS_BOOTSTRAP);
    this.bootstraps = [];
    // todo before create injector and pass as parameter
    for (const clz of classes) {
      if (clz !== Bootstrap) {
        this.bootstraps.push(Bootstrap.getContainer().get(clz));
      }
    }
    return this.bootstraps;
  }


  async startup(command: ICommand = null): Promise<Bootstrap> {
    Log.debug('startup ...');

    if (command && command.beforeStartup) {
      await command.beforeStartup();
    }


    await this.createSystemInfo();

    let activators = this.getActivators();
    activators = _.filter(activators, a => _.isFunction(a['startup']));
    for (const activator of activators) {
      Log.debug('activate ' + ClassesLoader.getModulName(activator.constructor));
      await activator.startup();
    }

    // TODO how to handle dependencies?
    let bootstraps = this.getModulBootstraps();
    bootstraps = _.filter(bootstraps, a => _.isFunction(a['bootstrap']));
    for (const bootstrap of bootstraps) {
      Log.debug('bootstrap ' + ClassesLoader.getModulName(bootstrap.constructor));
      await bootstrap.bootstrap();
    }

    if (command && command.afterStartup) {
      await command.afterStartup();
    }


    this.running = true;

    // system ready
    for (const bootstrap of bootstraps) {
      if (bootstrap['ready']) {
        await bootstrap['ready']();
      }
    }

    Log.debug('startup finished.');
    return this;
  }

  async execCommand(clazz: Function, argv: any) {
    const command: ICommand = Container.get(clazz);
    return await command.handler(argv);
  }

  async shutdown(exitCode: number = 0) {
    if (!this.running) {
      return;
    }
    this.running = false;
    Log.debug('shutdown ... exitCode: ' + exitCode);

    let bootstraps = this.getModulBootstraps();
    bootstraps = _.filter(bootstraps, a => _.isFunction(a['shutdown']));
    for (const bootstrap of bootstraps) {
      Log.debug('shutdown of ' + ClassesLoader.getModulName(bootstrap.constructor));
      await (<IShutdown>bootstrap).shutdown();
    }

    LockFactory.$().shutdown(10000);
    // shutdown storages
    // await Promise.all(this.storage.getNames().map(x => this.storage.get(x).shutdownOnFinish()));

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


  getCommands(withInject: boolean = true): ICommand[] {
    const commands = [];
    for (const clz of this.runtimeLoader.getClasses(K_CLS_COMMANDS)) {
      if (withInject) {
        commands.push(Bootstrap.getContainer().get(clz));
      } else {
        commands.push(Reflect.construct(clz, []));
      }
    }
    return commands;
  }


  getAppPath() {
    return this._options.app.path;
  }


  getModules(): IModule[] {
    const regModules = this.getLoader().registry.modules();
    const modules: IModule[] = [];
    for (const _module of regModules) {
      const moduleInfo: IModule = _module;
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
