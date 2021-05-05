import {ILoggerApi} from './ILoggerApi';
import {ILoggerOptions} from './ILoggerOptions';
import {ILogLevel} from '@allgemein/base';
import {Writable} from 'stream';
import {ILogEntry} from './ILogEntry';

export interface IStreamLoggerOptions extends ILoggerOptions {
  writeStream: Writable;

}

export class StreamLogger implements ILoggerApi {

  name: string;

  writeStream: Writable;

  options: ILoggerOptions;

  constructor(name: string, opts?: IStreamLoggerOptions) {
    this.name = name;
    this.options = opts;
    if (!opts.writeStream || !(opts.writeStream instanceof Writable)) {
      throw new Error('no stream passed');
    }
    this.writeStream = opts.writeStream;
  }

  clear(): void {
  }

  close(): void {
  }


  getLevel(): ILogLevel {
    return {name: this.getOptions().level, nr: null};
  }


  setLevel(level: string): void {
    this.getOptions().level = level;
  }


  getOptions(): ILoggerOptions {
    return this.options;
  }


  isEnabled(set?: boolean): boolean {
    return true;
  }

  remove(): void {
  }

  /**
   * Generic log method putting log data to stream
   *
   * TODO error function for write
   *
   * @param level
   * @param msg
   */
  log(level: number | string, ...msg: any[]): void {
    const event: ILogEntry = {
      level: level,
      args: msg,
      time: new Date(),
      prefix: this.options.prefix,
      parameters: this.options.parameters
    };
    this.writeStream.write(JSON.stringify(event));
  }

  trace(...msg: any[]): void {
    this.log('trace', ...msg);
  }

  debug(...msg: any[]): void {
    this.log('debug', ...msg);
  }

  info(...msg: any[]): void {
    this.log('info', ...msg);
  }

  error(...msg: any[]): void {
    this.log('error', ...msg);
  }

  warn(...msg: any[]): void {
    this.log('warn', ...msg);
  }

  build(name: string, options: ILoggerOptions, append?: boolean): ILoggerApi {
    return undefined;
  }

}
