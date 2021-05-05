import {ILoggerApi} from './ILoggerApi';
import {ILoggerOptions} from './ILoggerOptions';
import {ILogLevel} from '@allgemein/base';

export class ConsoleLogger implements ILoggerApi {
  name: string;

  clear(): void {
  }

  close(): void {
  }

  debug(...msg: any[]): void {
    console.log('debug: ', ...msg);
  }

  error(...msg: any[]): void {
    console.error('error: ', ...msg);
  }

  getLevel(): ILogLevel {
    return undefined;
  }

  getOptions(): ILoggerOptions {
    return undefined;
  }

  info(...msg: any[]): void {
    console.log('info: ', ...msg);
  }

  isEnabled(set?: boolean): boolean {
    return false;
  }

  log(level: number | string, ...msg: any[]): void {
    console.log('level: ' + level, ...msg);
  }

  remove(): void {
  }

  setLevel(level: number | string): void {
  }

  trace(...msg: any[]): void {
    console.log('trace: ', ...msg);
  }

  warn(...msg: any[]): void {
    console.warn(...msg);
  }

  build(name: string, options: ILoggerOptions, append?: boolean): ILoggerApi {
    throw new Error('Method not implemented.');
  }

}
