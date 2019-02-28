import {ITaskRunResult} from "./ITaskRunResult";

export interface ITaskRunnerResult {

  start: Date;

  stop: Date;

  duration: number;

  progress?: number;

  results: ITaskRunResult[];

}
