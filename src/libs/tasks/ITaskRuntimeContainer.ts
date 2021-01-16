import {ILoggerApi} from '@allgemein/base';
import {TaskState} from './TaskState';
import {Counter} from '../helper/Counter';

export interface ITaskRuntimeContainer {

  runnerId: string;

  taskNr: number;

  name: string;

  logger?(): ILoggerApi;

  progress?(progress: number): void;

  total?(total: number): void;

  addTask(name: string, incomings?: any): Promise<TaskState>;

  /**
   * Get counters entry for increase/decrease some value
   * @param key
   */
  counter(key: string): Counter;

}
