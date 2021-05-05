import * as _ from 'lodash';
import {ILoggerOptions} from './ILoggerOptions';
import {C_DEFAULT, ClassUtils} from '@allgemein/base';
// import {WinstonLoggerJar} from './WinstonLoggerJar';
import {BaseUtils} from '../../libs/utils/BaseUtils';
import {InterpolationSupport} from '@allgemein/config/supports/InterpolationSupport';
import {ILoggerApi} from './ILoggerApi';
import {MatchUtils} from '../utils/MatchUtils';
import {ClassType} from '@allgemein/schema-api';
import {ConsoleLogger} from './ConsoleLogger';


export class Log {


  private constructor() {
  }


  get logger(): ILoggerApi {
    if (!this.initial) {
      this.options(Log.DEFAULT_OPTIONS);
    }
    return this.getLogger();
  }

  static DEFAULT_OPTIONS = {};

  static LOGGER_CLASS: ClassType<ILoggerApi> = ConsoleLogger;

  static self: Log = null;

  static enable = true;

  static prefix = '';

  static inc = 0;

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

  static trace(...args: any[]) {
    args.unshift('SILLY');
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
          if (MatchUtils.miniMatch(a.match, name)) {
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
      l = Reflect.construct(Log.LOGGER_CLASS, [name, opts]);
      this.loggers[name] = l;
    }
    return l;
  }


  createLogger(name: string, params: any = {}, options: ILoggerOptions = {}) {
    let defaultOptions = this.getLoggerOptionsFor(name);
    if (!defaultOptions) {
      defaultOptions = Log.DEFAULT_OPTIONS;
      defaultOptions.name = 'logger_' + Log.inc++;
    } else {
      _.defaults(defaultOptions, Log.DEFAULT_OPTIONS);
    }


    const optsClone = _.cloneDeep(defaultOptions);
    // apply additional options
    if (options && !_.isEmpty(options)) {
      _.assign(optsClone, options);
    }

    if (params.prefix) {
      optsClone.prefix = params.prefix;
    }

    delete optsClone.match;
    InterpolationSupport.exec(optsClone, params);
    return this.createOrUpdateLogger(name, optsClone);
  }


  removeLogger(name: string) {
    const logger = this.getLogger(name);
    if (logger && logger.close) {
      logger.close();
    }
    delete this.loggers[name];
  }


  private options(options: ILoggerOptions, append: boolean = false) {
    if (append && this.globalOptions) {
      options = BaseUtils.merge(this.globalOptions, options);
    }
    this.globalOptions = _.defaults(options, Log.DEFAULT_OPTIONS);
    Log.enable = this.globalOptions.enable;
    //  Log.enableEvents = this.globalOptions.events;
    this.initial = true;
    this.createOrUpdateLogger(C_DEFAULT, this.globalOptions, append);
    return this.globalOptions;
  }

}
