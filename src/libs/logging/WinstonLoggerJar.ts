import {ILogLevel, TodoException} from "commons-base";
import * as winston from "winston";
import {createLogger, Logger, LoggerOptions} from "winston";
import {ILoggerOptions} from "./ILoggerOptions";
import {Log} from "../../libs/logging/Log";
import {BaseUtils} from "../../libs/utils/BaseUtils";
import * as _ from "lodash";
import {ConsoleTransportOptions} from "winston/lib/winston/transports";
import {DefaultFormat} from "./DefaultFormat";
import {LogEvent} from "./LogEvent";
import {ILoggerApi} from "./ILoggerApi";
import {format} from "logform";
import {DefaultJsonFormat} from "./DefaultJsonFormat";

const DEFAULT_TRANSPORT_OPTIONS: ConsoleTransportOptions = {

};


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

  enabled: boolean = true;

  _logger: Logger;

  options: ILoggerOptions;


  constructor(opts?: ILoggerOptions) {
    this.options = opts;
    this.build(opts);
  }


  static registerTransportType(name: string, transportClass: Function) {
    this.transportTypes[name] = transportClass;
  }


  static registerFormat(name: string, transportClass: Function) {
    this.formats[name] = transportClass;
  }

  stream(opts:any = {}){
    return this._logger.stream(opts);
  }

  logger(){
    return this._logger;
  }

  getOptions() {
    return this.options;
  }


  build(options: ILoggerOptions, append: boolean = false) {
    if (append && this.options) {
      options = BaseUtils.merge(this.options, options)
    }

    if (options.prefix) {
      this.prefix = options.prefix;
    }

    let opts: LoggerOptions = {
      level: this.options.level,
      transports: [],
    };

    this.detectFormat(options, opts);

    let t: any[] = [];
    for (let opt of options.transports) {
      let k = Object.keys(opt).shift();
      let transportOptions: any = _.defaults(opt[k], DEFAULT_TRANSPORT_OPTIONS);
      if (_.has(WinstonLoggerJar.transportTypes, k)) {
        t.push(Reflect.construct(WinstonLoggerJar.transportTypes[k], [transportOptions]));
      } else {
        throw new TodoException('log: transport type ' + k + ' not found.')
      }
    }
    opts.transports = t;

    this._logger = createLogger(opts);
    return this;
  }


  detectFormat(options: ILoggerOptions, opts: LoggerOptions) {
    if (!_.has(options, 'format')) {
      opts.format = new DefaultFormat()
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
    return this.enabled;
  }


  log(level: string, ...msg: any[]): void {
    if (msg[0] instanceof LogEvent) {
      this._logger.log(level, msg[0].message(), {event:msg[0]})
    } else {
      let l = new LogEvent({args: msg, level: level, prefix: this.prefix});
      this._logger.log(level, l.message(), {event:l})
    }
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
    this.log('trace', ...msg);
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
}
