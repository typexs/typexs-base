import * as _ from 'lodash';
import {CryptUtils} from "./libs/utils/CryptUtils";
import {ILoggerOptions, K_LOGGING} from "./libs/logging/ILoggerOptions";
import {Log} from "./libs/logging/Log";
import {IOptions, IFileConfigOptions} from "commons-config";
import {PlatformUtils} from "./libs/utils/PlatformUtils";
import {Utils} from "./libs/utils/Utils";
import {RuntimeLoader} from "./base/RuntimeLoader";
import {IRuntimeLoaderOptions} from "./base/IRuntimeLoaderOptions";
import {ClassLoader} from "./libs/utils/ClassLoader";
import {IActivator} from "./api/IActivator";
import {Config} from "commons-config/config/Config";
import {IModule} from "./api/IModule";

const DEFAULT_CONFIG_LOAD_ORDER = [
  {type: 'file', file: '${argv.configfile}'},
  {type: 'file', file: '${env.configfile}'},
  <IFileConfigOptions>{type: 'file', file: {dirname: './config', filename: 'typexs'}, prefix: 'typexs'},
  {
    type: 'file',
    file: {dirname: './config', filename: '${typexs.app.name}'},
    pattern: [
      'secrets',
      '${typexs.app.name}--${os.hostname}',
      '${typexs.app.name}--${env.stage}',
      '${typexs.app.name}--${argv.stage}'
    ]
  }
];


export interface ITypexsOptions {
  app?: {
    name?: string
    path?: string
  },

  modules?: IRuntimeLoaderOptions

}

export const K_CLS_ACTIVATOR = 'activator.js';

export const DEFAULT_RUNTIME_OPTIONS: IRuntimeLoaderOptions = {

  appdir: '.',

  paths: [],

  libs: [
    {topic: K_CLS_ACTIVATOR, refs: ['Activator', 'src/Activator']},
    {topic: 'commands', refs: ['commands', 'src/commands']},
    {topic: 'generators', refs: ['generators', 'src/generators']}
  ]

}


const DEFAULT_OPTIONS = {
  app: {
    name: 'app',
    path: '.'
  },

  modules: DEFAULT_RUNTIME_OPTIONS
}

export class Bootstrap {

  private static nodeId: string = CryptUtils.shorthash(CryptUtils.random(8));

  private static $self: Bootstrap = null;

  private CONFIG_LOADED: boolean = false;

  private cfgOptions: IOptions = null;

  private VERBOSE_DONE: boolean = false;

  private runtimeLoader: RuntimeLoader = null;

  private activators: IActivator[] = [];

  private _options: ITypexsOptions;


  private constructor(options: ITypexsOptions = {}) {
    this._options = _.defaults(options, DEFAULT_OPTIONS);
    let config_load_order = _.cloneDeep(DEFAULT_CONFIG_LOAD_ORDER);
    this.cfgOptions = {configs: config_load_order};
  }


  static _(options: ITypexsOptions = {}): Bootstrap {
    if (!this.$self) {
      this.$self = new Bootstrap(options);
    }
    return this.$self
  }


  static reset() {
    this.$self = null;
  }

  initializeLogger() {
    let o_logging: ILoggerOptions = Config.get(K_LOGGING, {});
    Log.prefix = Bootstrap.nodeId + ' ';
    Log.options(o_logging);
  }


  activateErrorHandling() {
    process.on('unhandledRejection', this.throwedUnhandledRejection.bind(this));
    process.on('uncaughtException', this.throwedUncaughtException.bind(this));
    process.on('warning', Log.warn.bind(Log))
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
        transports: [
          {
            console: {
              name: 'stderr',
              defaultFormatter: true,
              stderrLevels: ['info', 'debug', 'error', 'warn']
            }
          }
        ]
      }, true)
    }
  }


  static addConfigOptions(options: IOptions) {
    let opts = this._().cfgOptions;
    this._().cfgOptions = Utils.merge(opts, options);
    return this._().cfgOptions;
  }


  static configure(options: ITypexsOptions = {}): Bootstrap {
    return this._(options).configure()
  }


  configure(c: any = null) {
    if (this.CONFIG_LOADED) {
      Log.warn('already configured')
      return this;
    }
    this.CONFIG_LOADED = true;

    if (this._options.app.path) {
      this.cfgOptions.workdir = this._options.app.path;
    }


    // check if it is an file
    try {
      let additionalData = null

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
        Config.jar().merge(additionalData);
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

    let typexs = Config.get('typexs', {});
    this._options = Utils.merge(this._options, typexs);

    return this;
  }


  async prepareRuntime(): Promise<Bootstrap> {
    this._options.modules.appdir = this._options.app.path;
    this.runtimeLoader = new RuntimeLoader(this._options.modules);
    await this.runtimeLoader.prepare();
    return this;
  }


  private createActivatorInstances() {
    let classes = this.runtimeLoader.getClasses(K_CLS_ACTIVATOR);

    // todo before create injector and pass as parameter
    for (let clz of classes) {
      this.activators.push(<IActivator>ClassLoader.createObjectByType(clz));
    }
    return this;

    // ...
  }


  async startup() {
    this.createActivatorInstances();
    await Promise.all(_.map(this.activators, async (a) => {
      return a.startup()
    }))
  }


  getCommands() {
    let commands = []
    for (let clz of this.runtimeLoader.getClasses('commands')) {
      commands.push(<IActivator>ClassLoader.createObjectByType(clz));
    }
    return commands;
  }

  getAppPath() {
    return this._options.app.path
  }


  getModules():IModule[]{
    return this.runtimeLoader.registry.modules();
  }





  //
  // async initStorage(): Promise<InternStorage> {
  //   let o_storage: IStorageOptions = Config.get(K_STORAGE, {});
  //
  //
  //   // FIXME currently special config for postgres
  //   /*
  //   process.env.DB_TYPE_DATETIME = 'datetime';
  //   process.env.DB_TYPE_JSON = 'text';
  //
  //   if (o_storage.type === 'postgres') {
  //     process.env.DB_TYPE_DATETIME = 'timestamp without time zone';
  //     process.env.DB_TYPE_JSON = 'jsonb'
  //   }
  //   */
  //
  //
  //   this.storage = new InternStorage(o_storage);
  //   await this.storage.prepare();
  //   return this.storage;
  //
  //   // Support exit throw Ctrl+C
  //   // process.on('exit', this.shutdown.bind(this))
  //   // process.on('SIGINT', this.shutdown.bind(this))
  // }
  //
  //
  // async shutdown() {
  //   Log.info("Shutdown ...");
  //   try {
  //     await this.storage.shutdown()
  //   } catch (err) {
  //     Log.error('Shutdown error', err)
  //   }
  // }


}
