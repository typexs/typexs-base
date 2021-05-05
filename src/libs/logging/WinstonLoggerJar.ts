import {C_DEFAULT, ILogLevel, TodoException} from '@allgemein/base';
import * as winston from 'winston';
import {createLogger, Logger, LoggerOptions} from 'winston';
import {ILoggerOptions} from './ILoggerOptions';
import {Log} from '../../libs/logging/Log';
import {BaseUtils} from '../../libs/utils/BaseUtils';
import * as _ from 'lodash';
import {ConsoleTransportOptions} from 'winston/lib/winston/transports';
import {DefaultFormat} from './DefaultFormat';
import {LogEvent} from './LogEvent';
import {ILoggerApi} from './ILoggerApi';
import {DefaultJsonFormat} from './DefaultJsonFormat';
import {isLogEntry} from './ILogEntry';


const DEFAULT_TRANSPORT_OPTIONS: ConsoleTransportOptions = {};


export class WinstonLoggerJar implements ILoggerApi {

  static transportTypes: { [name: string]: Function } = {
    console: winston.transports.Console,
    file: winston.transports.File,
    http: winston.transports.Http
  };

  static formats: { [name: string]: Function } = {
    default: DefaultFormat,
    json: DefaultJsonFormat
  };

  prefix: string;

  enabled = true;

  _logger: Logger;

  options: ILoggerOptions;

  name: string = C_DEFAULT;

  constructor(name: string, opts?: ILoggerOptions) {
    this.options = opts;
    this.build(name, opts);
  }


  static registerTransportType(name: string, transportClass: Function) {
    this.transportTypes[name] = transportClass;
  }


  static registerFormat(name: string, transportClass: Function) {
    this.formats[name] = transportClass;
  }

  stream(opts: any = {}) {
    return this._logger.stream(opts);
  }

  logger() {
    return this._logger;
  }

  getOptions() {
    return this.options;
  }


  build(name: string, options: ILoggerOptions, append: boolean = false) {
    this.name = name;

    if (append && this.options) {
      this.options = BaseUtils.merge(this.options, options);
    } else if (!append) {
      this.options = options;
    }

    this.enabled = _.get(options, 'enable', true);

    if (options.prefix) {
      this.prefix = options.prefix;
    }

    const opts: LoggerOptions = {
      level: this.options.level,
      transports: [],
    };

    this.detectFormat(options, opts);

    const t: any[] = [];
    if (_.has(options, 'transports')) {
      for (const opt of options.transports) {
        const k = _.keys(opt).shift();
        const transportOptions: any = _.defaults(opt[k], DEFAULT_TRANSPORT_OPTIONS);
        if (_.has(WinstonLoggerJar.transportTypes, k)) {
          t.push(Reflect.construct(WinstonLoggerJar.transportTypes[k], [transportOptions]));
        } else {
          throw new TodoException('log: transport type ' + k + ' not found.');
        }
      }
      opts.transports = t;
    }
    if (this._logger) {
      this._logger.configure(opts);
    } else {
      this._logger = createLogger(opts);
    }
    return this;
  }


  detectFormat(options: ILoggerOptions, opts: LoggerOptions) {
    if (!_.has(options, 'format')) {
      opts.format = new DefaultFormat();
    } else {
      if (_.isFunction(options.format)) {
        opts.format = <any>options.format;
      } else if (_.isString(options.format)) {
        if (!_.has(WinstonLoggerJar.formats, options.format)) {
          throw new Error('can\'t find log format ' + options.format);
        }
        opts.format = Reflect.construct(_.get(WinstonLoggerJar.formats, options.format), []);
      } else {
        opts.format = options.format;
      }
    }
  }


  isEnabled(set?: boolean): boolean {
    if (_.isBoolean(set)) {
      this.enabled = set;
    }
    if (_.get(this.options, 'force', false)) {
      return this.enabled;
    }
    return this.enabled && Log.enable;
  }


  log(level: string, ...msg: any[]): void {
    if (!this.isEnabled() || this._logger.transports && this._logger.transports.length === 0) {
      return;
    }

    let l: LogEvent = null;
    if (isLogEntry(msg[0])) {
      l = new LogEvent(msg[0]);
    } else if (msg[0] instanceof LogEvent) {
      l = msg[0];
    } else {
      l = new LogEvent({args: msg, level: level, prefix: this.prefix});
    }
    this._logger.log(level, l.message(), {event: l});
  }


  debug(...msg: any[]): void {
    this.log('debug', ...msg);
  }


  error(...msg: any[]): void {
    this.log('error', ...msg);
  }


  info(...msg: any[]): void {
    this.log('info', ...msg);
  }


  trace(...msg: any[]): void {
    this.log('silly', ...msg);
  }


  warn(...msg: any[]): void {
    this.log('warn', ...msg);
  }


  getLevel(): ILogLevel {
    return {name: this._logger.level, nr: null};
  }


  setLevel(level: string): void {
    this._logger.level = level;
  }


  clear() {
    this._logger.clear();
  }


  close() {
    this._logger.close();
  }

  remove() {
    this.close();
    Log._().removeLogger(this.name);
  }


}
