import {ITaskRunResult} from './ITaskRunResult';
import {TASK_STATES} from './Constants';

export interface ITaskRunnerResult {

  // TaskRunner id
  id: string;

  callerId: string;

  nodeId: string;

  targetIds: string[];

  state: TASK_STATES;

  start: Date;

  stop: Date;

  duration: number;

  progress?: number;

  tasks?: string[];

  results: ITaskRunResult[];

}
