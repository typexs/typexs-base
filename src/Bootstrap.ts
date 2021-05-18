import {cloneDeep, defaults, filter, has, isFunction, isObject, isString} from 'lodash';
import {Log} from './libs/logging/Log';
import {Config, IConfigOptions, IOptions} from '@allgemein/config';
import {RuntimeLoader} from './base/RuntimeLoader';
import {IActivator} from './api/IActivator';
import {IModule} from './api/IModule';
import {IStorageOptions, K_STORAGE} from './libs/storage/IStorageOptions';
import {Storage} from './libs/storage/Storage';
import {BaseUtils} from './libs/utils/BaseUtils';
import {CryptUtils, MetaArgs, PlatformUtils} from '@allgemein/base';
import {
  CONFIG_NAMESPACE,
  K_CLS_ACTIVATOR,
  K_CLS_API,
  K_CLS_BOOTSTRAP,
  K_CLS_COMMANDS,
  K_CLS_USE_API
} from './libs/Constants';
import {IBootstrap} from './api/IBootstrap';
import {ClassesLoader} from '@allgemein/moduls';
import {ITypexsOptions} from './libs/ITypexsOptions';
import {Invoker} from './base/Invoker';
import {IShutdown} from './api/IShutdown';
import {System} from './libs/system/System';
import {ICommand} from './libs/commands/ICommand';
import {LockFactory} from './libs/LockFactory';
import {Injector} from './libs/di/Injector';
import {EntityControllerRegistry} from './libs/storage/EntityControllerRegistry';
import {IRuntimeLoader} from './libs/core/IRuntimeLoader';
import {WinstonLoggerJar} from './libs/logging/WinstonLoggerJar';
import {DEFAULT_LOGGER_OPTIONS} from './libs/logging/Constants';
import {RegistryFactory} from '@allgemein/schema-api';
import {DEFAULT_TYPEXS_OPTIONS} from './libs/config/Constants';
import {ConfigLoadOrder} from './libs/config/ConfigLoadOrder';

/**
 * Bootstrap controls the stages of application startup. From configuration to full startup for passed command.
 *
 * Stages:
 * - set configuration file load order
 * - load configuration from config files
 * - TODO: first schema validation?
 * - get modules list (paths are passed through initial configuration)
 * - load config.schema.json or config.schema.js or maybe passed through Activator?
 * - TODO: extend config schema for validation
 * - validate current given configuration, if fails abort startup, else proceed to next stage
 * - initialise Activator's for specific lib startup or other modul specific initialisations
 * -
 */
export class Bootstrap {

  private constructor(options: ITypexsOptions = {}) {
    options = options || {};
    this.options = defaults(options, cloneDeep(DEFAULT_TYPEXS_OPTIONS));
    this.initConfigSources();
  }


  private static $self: Bootstrap = null;

  private nodeId: string = CryptUtils.shorthash(CryptUtils.random(8));

  private options: ITypexsOptions;

  private configOptions: IOptions = {};

  private CONFIG_LOADED = false;

  private VERBOSE_DONE = false;

  private runtimeLoader: IRuntimeLoader = null;

  private activators: IActivator[] = null;

  private bootstraps: IBootstrap[] = null;

  private storage: Storage;


  private running = false;

  static _(options: ITypexsOptions = {}): Bootstrap {
    if (!this.$self) {
      this.$self = new Bootstrap(options);
    }
    return this.$self;
  }


  static reset() {
    this.$self = null;
    Injector.reset();
    Log.reset();
    Config.clear();
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
    const opts = this._().configOptions;
    this._().configOptions = BaseUtils.merge(opts, options);
    return this._().configOptions;
  }


  static getContainer() {
    return Injector;
  }


  static configure(options: ITypexsOptions = {}): Bootstrap {
    return this._(options).configure();
  }


  static setConfigSources(sources: IConfigOptions[]) {
    return this._().setConfigSources(sources);
  }

  static prepareInvoker(i: Invoker, loader: IRuntimeLoader) {
    // lade klassen mit erweiterung, jedoch welche erweiterung implementieren diese
    const apiClasses = loader.getClasses(K_CLS_API);
    loader.getClasses(K_CLS_USE_API);
    const apis = MetaArgs.key(K_CLS_USE_API);
    apiClasses.forEach(api => {
      i.register(api, apis.filter(x => x.api === api).map(x => x.target));
    });
  }


  /**
   * Initialise config sources types and load order.
   */
  initConfigSources() {
    const cs = this.getConfigSources();
    this.setConfigSources(cs);
  }

  /**
   * Check if config file load order is present. Possible passthourgh of the config order is:
   * - env variable
   * - load config order json file fi exists
   *   - like config-load.json oder ./config/config-load.json
   * - use at least DEFAULT_CONFIG_LOAD_ORDER
   */
  getConfigSources() {
    const configLoadOrder = new ConfigLoadOrder();
    configLoadOrder.detect();
    return configLoadOrder.get();
  }


  setConfigSources(sources: IConfigOptions[]) {
    this.configOptions.configs = sources;
    return this;
  }


  getNodeId() {
    return Bootstrap.getNodeId();
  }

  /**
   * Returns the typexs options.
   */
  getOptions() {
    return this.options;
  }

  /**
   * Activate the logger.
   */
  activateLogger(): Bootstrap {
    Log.prefix = this.getNodeId() + ' ';
    Log.options(this.options.logging || {enable: false});
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

    Injector.set(Storage, this.storage);
    Injector.set(Storage.NAME, this.storage);
    Injector.set(K_STORAGE, this.storage);


    // get configurated storages
    const o_storage: { [name: string]: IStorageOptions } = Config.get(K_STORAGE, CONFIG_NAMESPACE, {});

    await this.storage.prepare(o_storage, this.runtimeLoader);

    // create registry for entity controller which maybe loaded per dependency injection
    const entityControllerRegistry = Injector.create(EntityControllerRegistry);
    Injector.set(EntityControllerRegistry.NAME, entityControllerRegistry);
    Injector.set(EntityControllerRegistry, entityControllerRegistry);

    this.storage.getRefs().forEach(x => {
      Injector.set([K_STORAGE, x.getName()].join('.'), x);
      entityControllerRegistry.add(x.getController());
    });


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


  configure(c: any = null) {
    // set logger class
    Log.DEFAULT_OPTIONS = DEFAULT_LOGGER_OPTIONS;
    Log.LOGGER_CLASS = WinstonLoggerJar;

    if (this.CONFIG_LOADED) {
      Log.warn('already configured');
      return this;
    }
    this.CONFIG_LOADED = true;

    if (this.options.app.path) {
      this.configOptions.workdir = this.options.app.path;
    }

    // check if it is an file
    try {
      let additionalData = null;

      if (isString(c)) {
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
            this.configOptions.configs.push({type: 'file', file: configfile});
          } else {
            // INFO that file couldn't be loaded, because it doesn't exist
          }
        }
      } else if (isObject(c)) {
        additionalData = c;
      }

      this.configOptions = Config.options(this.configOptions);

      if (isObject(additionalData)) {
        Config.jar(CONFIG_NAMESPACE).merge(additionalData);
      }

      this.configOptions.configs.forEach(_c => {
        if (_c.state && _c.type !== 'system') {
          Log.debug('Loaded configuration from ' + (isString(_c.file) ? _c.file : _c.file.dirname + '/' + _c.file.filename));
        }
      });

    } catch (err) {
      Log.error(err);
      process.exit(1);
    }
    const add = Config.jar(CONFIG_NAMESPACE).get('');
    this.options = BaseUtils.merge(this.options, add);
    Config.jar(CONFIG_NAMESPACE).merge(this.options);

    /**
     * Override nodeId if given
     */

    const appNodeId = Config.get('app.nodeId', Config.get('argv.nodeId', null));
    this.nodeId = appNodeId ? appNodeId : this.nodeId;
    return this;
  }


  async prepareRuntime(): Promise<Bootstrap> {

    this.options.modules.appdir = this.options.app.path;
    let cachePath = has(this.options.modules, 'cachePath') ?
      this.options.modules.cachePath :
      PlatformUtils.join(Config.get('os.tmpdir', '/tmp'), '.txs', 'cache');
    cachePath = PlatformUtils.pathNormAndResolve(cachePath);
    if (!PlatformUtils.fileExist(cachePath)) {
      PlatformUtils.mkdir(cachePath);
    }
    this.options.modules.cachePath = cachePath;
    this.runtimeLoader = new RuntimeLoader(this.options.modules);
    Injector.set(RuntimeLoader, this.runtimeLoader);
    Injector.set(RuntimeLoader.NAME, this.runtimeLoader);
    await this.runtimeLoader.prepare();

    const invoker = new Invoker();
    Injector.set(Invoker.NAME, invoker);
    Bootstrap.prepareInvoker(invoker, this.runtimeLoader);

    // update config
    Config.jar(CONFIG_NAMESPACE).set('modules', this.runtimeLoader.getOptions());
    this.addShutdownEvents();

    // load activators on storage,
    this.getActivators();
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
    const os = PlatformUtils.load('os');
    const system = Injector.create(System);
    await system.initialize(os.hostname(), this.getNodeId());
    Injector.getContainer().set(System.NAME, system);
    // todo ip + command
    return this;
  }


  private createActivatorInstances() {
    const classes = this.runtimeLoader.getClasses(K_CLS_ACTIVATOR);
    this.activators = [];
    // todo before create injector and pass as parameter
    for (const clz of classes) {
      this.activators.push(Injector.get(clz));
    }
    return this.activators;
  }


  private createBootstrapInstances() {
    const classes = this.runtimeLoader.getClasses(K_CLS_BOOTSTRAP);
    this.bootstraps = [];
    // todo before create injector and pass as parameter
    for (const clz of classes) {
      if (clz !== Bootstrap) {
        this.bootstraps.push(Injector.get(clz));
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
    activators = filter(activators, a => isFunction(a['startup']));
    for (const activator of activators) {
      Log.debug('activate ' + ClassesLoader.getModulName(activator.constructor));
      await activator.startup();
    }

    // TODO how to handle dependencies?
    let bootstraps = this.getModulBootstraps();
    bootstraps = filter(bootstraps, a => isFunction(a['bootstrap']));
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
    const command: ICommand = Injector.get(clazz);
    return await command.handler(argv);
  }

  async shutdown(exitCode: number = 0) {
    if (!this.running) {
      return;
    }
    this.running = false;
    Log.debug('onShutdown ... exitCode: ' + exitCode);

    let bootstraps = this.getModulBootstraps();
    bootstraps = filter(bootstraps, a => isFunction(a['shutdown']));
    for (const bootstrap of bootstraps) {
      Log.debug('onShutdown of ' + ClassesLoader.getModulName(bootstrap.constructor));
      await (<IShutdown>bootstrap).shutdown();
    }


    await this.getStorage().shutdown();
    try {
      await LockFactory.$().shutdown(500);
    } catch (e) {
    }
    LockFactory.reset();

    RegistryFactory.getNamespaces().map(x => {
      RegistryFactory.remove(x);
    });

    process.removeAllListeners('exit');
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
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
        commands.push(Injector.get(clz));
      } else {
        commands.push(Reflect.construct(clz, []));
      }
    }
    return commands;
  }


  getAppPath() {
    return this.options.app.path;
  }


  getModules(): IModule[] {
    const regModules = this.getLoader().getRegistry().getModules();
    const modules: IModule[] = [];
    for (const _module of regModules) {
      const moduleInfo: IModule = _module;
      moduleInfo.settings = this.getLoader().getSettings(_module.name);
      moduleInfo.enabled = this.getLoader().getDisabledModuleNames().indexOf(_module.name) === -1;
      modules.push(moduleInfo);
    }
    return modules;
  }


  getLoader(): IRuntimeLoader {
    return this.runtimeLoader;
  }


  getStorage() {
    return this.storage;
  }


}
