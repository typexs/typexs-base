import {ITaskRunResult} from './ITaskRunResult';
import {Counters} from '../helper/Counters';

export class TaskState implements ITaskRunResult {

  tasksId: string;

  name: string;

  nr: number;

  created: Date = new Date();

  start: Date;

  stop: Date;

  duration: number;

  weight = 0;

  progress = 0;

  total = 1;

  done = false;

  running = false;

  incoming: any = {};

  outgoing: any = {};

  result: any = null;

  error: Error = null;

  has_error = false;

  /**
   * Statistical counters which can be used in task processing
   *
   * this.counters.get('item.active').inc()
   */
  counters: Counters = new Counters();

  calcDuration() {
    this.duration = this.stop.getTime() - this.start.getTime();
  }

}
