import {ITaskRunResult} from "./ITaskRunResult";

export class TaskState implements ITaskRunResult {

  tasksId: string;

  name: string;

  nr: number;

  created: Date = new Date();

  start: Date;

  stop: Date;

  duration: number;

  weight: number = 0;

  progress: number = 0;

  total: number = 1;

  done: boolean = false;

  running: boolean = false;

  incoming: any = {};

  outgoing: any = {};

  result: any = null;

  error: Error = null;

  has_error: boolean = false;

  calcDuration() {
    this.duration = this.stop.getTime() - this.start.getTime();
  }

}
