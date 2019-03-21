import {ILogLevel} from "commons-base";
import {ILoggerApi} from "../logging/ILoggerApi";
import {ILoggerOptions} from "../logging/ILoggerOptions";
import {LogEvent} from "../..";

export class TaskRuntimeLogger implements ILoggerApi {

  private taskId: string;
  private taskName: string;
  private taskNr: number;
  private baseLogger: ILoggerApi;

  constructor(taskId: string, taskName: string, taskNr: number, baseLogger: ILoggerApi) {
    this.taskId = taskId;
    this.taskName = taskName;
    this.taskNr = taskNr;
    this.baseLogger = baseLogger;
  }


  log(level: string, ...msg: any[]): void {
    let l = new LogEvent({args: msg, level: level, prefix: [this.taskId, this.taskName, this.taskNr].join(':')});
    this.baseLogger.log(level, l);
  }


  info(...msg: any[]): void {
    this.log('info', ...msg);
  }

  debug(...msg: any[]): void {
    this.log('debug', ...msg);
  }

  error(...msg: any[]): void {
    this.log('error', ...msg);
  }


  trace(...msg: any[]): void {
    this.log('trace', ...msg);
  }

  warn(...msg: any[]): void {
    this.log('warn', ...msg);
  }


  getLevel(): ILogLevel {
    return this.baseLogger.getLevel();
  }


  isEnabled(set?: boolean): boolean {
    return this.baseLogger.isEnabled();
  }

  setLevel(level: number | string): void {
  }

  clear(): void {
    //return this.baseLogger.clear();
  }

  close(): void {
    //return this.baseLogger.clear();
  }

  getOptions(): ILoggerOptions {
    return undefined;
  }

}
