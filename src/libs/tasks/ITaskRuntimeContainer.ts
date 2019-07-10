import {ILoggerApi} from 'commons-base';

export interface ITaskRuntimeContainer {

  runnerId: string;

  taskNr: number;

  name: string;

  logger?(): ILoggerApi;

  progress?(progress: number): void;

  total?(total: number): void;
}
