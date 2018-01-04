import * as _ from 'lodash';
import {CryptUtils} from "./libs/utils/CryptUtils";
import {ILoggerOptions, K_LOGGING} from "./libs/logging/ILoggerOptions";
import {Storage} from "./libs/storage/Storage";
import {Log} from "./libs/logging/Log";
import {Config, IOptions} from "commons-config";
import {PlatformUtils} from "./libs/utils/PlatformUtils";
import {Utils} from "./libs/utils/Utils";

const DEFAULT_CONFIG_LOAD_ORDER = [
  {type: 'file', file: '${argv.configfile}'},
  {type: 'file', file: '${env.configfile}'},
  {type: 'file', file: {dirname: './config', filename: 'typexs'}},
  {
    type: 'file',
    file: {dirname: './config', filename: '${app.name}'},
    pattern: [
      'secrets',
      '${app.name}--${os.hostname}',
      '${app.name}--${env.stage}',
      '${app.name}--${argv.stage}'
    ]
  }
];


export class Bootstrap {

  private static nodeId: string = CryptUtils.shorthash(CryptUtils.random(8));

  private static $self: Bootstrap = null;

  private CONFIG_LOADED: boolean = false;

  private cfgOptions: IOptions = null;

  private VERBOSE_DONE: boolean = false;


  private constructor() {
    this.cfgOptions = {configs: DEFAULT_CONFIG_LOAD_ORDER};
  }

  static _(): Bootstrap {
    if (!this.$self) {
      this.$self = new Bootstrap()
    }
    return this.$self
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


  static addConfigOptions(options:IOptions){
    let opts = this._().cfgOptions;
    this._().cfgOptions = Utils.merge(opts,options);

    return this._().cfgOptions;
  }

  static configure(c: any = null) {
    this._().configure(c)
  }

  configure(c: any = null) {
    if (this.CONFIG_LOADED) return;
    this.CONFIG_LOADED = true;

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
      }else if(_.isObject(c)){
        additionalData = c;
      }

      this.cfgOptions = Config.options(this.cfgOptions);

      if (_.isObject(additionalData)) {
        Config.jar().merge(additionalData);
      }

      this.cfgOptions.configs.forEach(_c => {
        if (_c.state && _c.type != 'system') {

          Log.info('Loaded configuration from ' + (_.isString(_c.file) ? _c.file : _c.file.dirname + '/'+_c.file.filename));
        }
      })

    } catch (err) {
      Log.error(err);
      process.exit(1)
    }
  }



}
