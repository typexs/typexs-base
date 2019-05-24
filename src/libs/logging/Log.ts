import * as _ from 'lodash';
import {ILoggerOptions} from './ILoggerOptions';
import {C_DEFAULT, ClassUtils} from 'commons-base';
import {WinstonLoggerJar} from './WinstonLoggerJar';
import {BaseUtils} from '../../libs/utils/BaseUtils';
import {isMatch} from 'micromatch';
import {InterpolationSupport} from 'commons-config';
import {ILoggerApi} from './ILoggerApi';


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


  private constructor() {
  }


  get logger(): ILoggerApi {
    if (!this.initial) {
      this.options(DEFAULT_OPTIONS);
    }
    return this.getLogger();
  }

  static self: Log = null;

  static enable = true;

  static prefix = '';

  static inc = 0;

//  static enableEvents: boolean = false;

  // static console: boolean = false;

  /**
   * check if configuration was loaded
   */
  private initial = false;

  private globalOptions: ILoggerOptions;

  private loggers: { [k: string]: ILoggerApi } = {};


  static reset() {
    this.self = null;
    this.enable = true;
    this.prefix = '';
  }


  static _() {
    if (!this.self) {
      this.self = new Log();
    }
    return this.self;
  }


  static getLogger(name: string = C_DEFAULT) {
    return this._().getLogger(name);
  }

  static getLoggerFor(fn: Function, opts: any = {}) {
    const name = ClassUtils.getClassName(fn);
    let exists = this._().getLogger(name);
    if (!exists) {
      opts.prefix = name;
      exists = this._().createLogger(name, opts);
    }
    return exists;
  }


  static options(options: ILoggerOptions, append: boolean = false): ILoggerOptions {
    return this._().options(options, append);
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
    Log.log.apply(Log, args);
  }


  static warn(...args: any[]) {
    args.unshift('WARN');
    Log.log.apply(Log, args);
  }


  static debug(...args: any[]) {
    args.unshift('DEBUG');
    Log.log.apply(Log, args);
  }


  static error(...args: any[]) {
    args.unshift('ERROR');
    Log.log.apply(Log, args);
  }

  getLogger(name: string = C_DEFAULT): ILoggerApi {
    if (_.has(this.loggers, name)) {
      return this.loggers[name];
    }
    return null;
  }


  getLoggerOptionsFor(name: string) {
    if (_.has(this.globalOptions, 'loggers')) {
      for (const a of this.globalOptions.loggers) {
        if (_.isUndefined(a.match)) {
          if (/\+|\.|\(|\\||\)|\*/.test(a.name)) {
            a.match = a.name;
          } else {
            a.match = false;
          }
        }
        if (_.isBoolean(a.match)) {
          if (a.name === name) {
            return a;
          }
        } else {
          if (isMatch(name, a.match)) {
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
      (<any>l).build(name, opts, append);
    } else {
      l = new WinstonLoggerJar(name, opts);
      this.loggers[name] = l;
    }
    return l;
  }


  createLogger(name: string, params: any = {}) {
    let opts = this.getLoggerOptionsFor(name);
    if (!opts) {
      opts = DEFAULT_OPTIONS;
      opts.name = 'logger_' + Log.inc++;
    } else {
      _.defaults(opts, DEFAULT_OPTIONS);
    }

    const optsClone = _.cloneDeep(opts);

    if (params.prefix) {
      optsClone.prefix = params.prefix;
    }

    delete optsClone.match;
    InterpolationSupport.exec(optsClone, params);
    return this.createOrUpdateLogger(name, optsClone);
  }


  removeLogger(name: string) {
    this.getLogger(name).close();
    delete this.loggers[name];
  }


  private options(options: ILoggerOptions, append: boolean = false) {
    if (append && this.globalOptions) {
      options = BaseUtils.merge(this.globalOptions, options);
    }
    this.globalOptions = _.defaults(options, DEFAULT_OPTIONS);
    Log.enable = this.globalOptions.enable;
    //  Log.enableEvents = this.globalOptions.events;
    this.initial = true;
    this.createOrUpdateLogger(C_DEFAULT, this.globalOptions, append);
    return this.globalOptions;
  }

}
