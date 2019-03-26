import * as _ from 'lodash'
import {ILoggerOptions} from "./ILoggerOptions";
import {C_DEFAULT} from "commons-base";
import {WinstonLoggerJar} from "./WinstonLoggerJar";
import {BaseUtils} from "../../libs/utils/BaseUtils";
import {Minimatch} from "minimatch";
import {InterpolationSupport} from "commons-config";
import {ILoggerApi} from "./ILoggerApi";


const DEFAULT_OPTIONS: ILoggerOptions = {
  enable: true,

  level: 'info',

  transports: [
    {
      console: {
        name: 'console',
        timestamp: true,
        json: false
      }
    }
  ]
};

export class Log {

  static self: Log = null;

  static enable: boolean = true;

  static prefix: string = '';

  static inc: number = 0;

//  static enableEvents: boolean = false;

  //static console: boolean = false;

  /**
   * check if configuration was loaded
   */
  private initial: boolean = false;

  private globalOptions: ILoggerOptions;

  private loggers: { [k: string]: ILoggerApi } = {};


  private constructor() {
  }


  static reset() {
    this.self = null;
    this.enable = true;
    this.prefix = '';
  }


  static _() {
    if (!this.self) {
      this.self = new Log()
    }
    return this.self
  }


  get logger(): ILoggerApi {
    if (!this.initial) {
      this.options(DEFAULT_OPTIONS)
    }
    return this.getLogger();
  }


  static getLogger(name: string = C_DEFAULT) {
    return this._().getLogger(name);
  }


  getLogger(name: string = C_DEFAULT): ILoggerApi {
    if (_.has(this.loggers, name)) {
      return this.loggers[name];
    }
    return null;
  }

  getLoggerOptionsFor(name: string) {
    if (_.has(this.globalOptions, 'loggers')) {
      let count: number = 0;
      for (let a of this.globalOptions.loggers) {
        if (_.isUndefined(a.match)) {
          if (/\+|\.|\(|\\||\)|\*/.test(a.name)) {
            a.match = new Minimatch(a.name);
          } else {
            a.match = false;
          }
        }
        if (_.isBoolean(a.match)) {
          if (a.name === name) {
            return a;
          }
        } else {
          if (a.match.match(name)) {
            return a;
          }
        }
      }
    }
    return null;
  }


  createOrUpdateLogger(name: string = C_DEFAULT, opts: ILoggerOptions, append: boolean = true) {
    let l = this.getLogger(name);
    if (l) {
      (<any>l).build(opts, append);
      Log.debug('update logger ' + name, opts);
    } else {
      l = new WinstonLoggerJar(opts);
      this.loggers[name] = l;
      if(name !== C_DEFAULT){
        Log.debug('create new logger ' + name, opts);
      }

    }
    return l;
  }


  createLogger(name: string, params: any = {}) {
    let opts = this.getLoggerOptionsFor(name);
    if (!opts) {
      opts = DEFAULT_OPTIONS;
      opts.name = 'logger_' + Log.inc++;
    }
    let optsClone = _.cloneDeep(opts);

    if(params.prefix){
      optsClone.prefix = params.prefix;
    }

    delete optsClone.match;
    InterpolationSupport.exec(optsClone, params);
    return this.createOrUpdateLogger(name, optsClone);
  }


  removeLogger(name: string) {
    this.getLogger(name).close();
    delete this.loggers[name];
    Log.info('remove logger ' + name);
  }


  static options(options: ILoggerOptions, append: boolean = false): ILoggerOptions {
    return this._().options(options, append)
  }


  private options(options: ILoggerOptions, append: boolean = false) {
    if (append && this.globalOptions) {
      options = BaseUtils.merge(this.globalOptions, options)
    }
    this.globalOptions = _.defaults(options, DEFAULT_OPTIONS);
    Log.enable = this.globalOptions.enable;
    //  Log.enableEvents = this.globalOptions.events;
    this.initial = true;
    this.createOrUpdateLogger(C_DEFAULT, this.globalOptions, append);
    return this.globalOptions;
  }

  /*
  createLogger(name:string,){
    let l = new (winston.Logger)(opts);
  }


  private create(opts: LoggerOptions): Log {
    this.loggers[C_DEFAULT] = new WinstonLoggerJar(opts);
    this.initial = true;
    return this
  }

  private options(options: ILoggerOptions, append: boolean = false) {
    if (append && this._options) {
      options = BaseUtils.merge(this._options, options)
    }

    this._options = _.defaults(options, DEFAULT_OPTIONS);
    Log.enable = this._options.enable;
    Log.enableEvents = this._options.events;
    let opts: LoggerOptions = {
      level: this._options.level,
      transports: []
    };


    for (let opt of options.transports) {

      let k = Object.keys(opt).shift();
      let transportOptions: any = _.defaults(opt[k], DEFAULT_TRANSPORT_OPTIONS);

      if (!transportOptions.formatter && transportOptions['defaultFormatter']) {
        transportOptions.formatter = Log.defaultFormatter;
      }

      switch (k) {
        case 'file':
          opts.transports.push(new File(transportOptions));
          break;
        case 'console':
          opts.transports.push(new Console(transportOptions));
          break;
        case 'dailyrotatefile':
          require('winston-daily-rotate-file');
          opts.transports.push(new DailyRotateFile(transportOptions));
          break;
        case 'http':
          opts.transports.push(new Http(transportOptions));
          break;
        case 'memory':
          opts.transports.push(new Memory(transportOptions));
          break;
        case 'webhook':
          opts.transports.push(new winston.transports.Webhook(transportOptions));
          break;
        case 'winstonmodule':
          opts.transports.push(new winston.transports.Loggly(transportOptions));
          break;
        default:
          throw new TodoException()
      }
    }
    this.create(opts);
    return this._options
  }

  static options(options: ILoggerOptions, append: boolean = false): ILoggerOptions {
    return this._().options(options, append)
}
*/

  static log(level: string, ...args: any[]) {
    if (Log.enable) {
      this._().logger.log(level.toLocaleLowerCase(), ...args);
    }
  }


  static info(...args: any[]) {
    args.unshift('INFO');
    Log.log.apply(Log, args)
  }


  static warn(...args: any[]) {
    args.unshift('WARN');
    Log.log.apply(Log, args)
  }


  static debug(...args: any[]) {
    args.unshift('DEBUG');
    Log.log.apply(Log, args)
  }


  static error(...args: any[]) {
    args.unshift('ERROR');
    Log.log.apply(Log, args)
  }

}
