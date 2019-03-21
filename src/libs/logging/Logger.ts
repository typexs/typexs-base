import {ILoggerApi, ILogLevel} from "commons-base";

export class Logger implements ILoggerApi {



  constructor(){

  }


  debug(...msg: any[]): void {
  }

  error(...msg: any[]): void {
  }

  getLevel(): ILogLevel {
    return undefined;
  }

  info(...msg: any[]): void {
  }

  isEnabled(set?: boolean): boolean {
    return false;
  }

  log(level: number | string, ...msg: any[]): void {
  }

  setLevel(level: number | string): void {
  }

  trace(...msg: any[]): void {
  }

  warn(...msg: any[]): void {
  }

}
