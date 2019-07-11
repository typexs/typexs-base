import {ILoggerApi} from 'commons-base';
import {TaskState} from './TaskState';

export interface ITaskRuntimeContainer {

  runnerId: string;

  taskNr: number;

  name: string;

  logger?(): ILoggerApi;

  progress?(progress: number): void;

  total?(total: number): void;

  addTask(name: string, incomings?: any): Promise<TaskState>;

}
