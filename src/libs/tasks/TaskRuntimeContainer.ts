import * as _ from 'lodash';
import {TaskRun} from './TaskRun';
import {ITaskRuntimeContainer} from './ITaskRuntimeContainer';
import {TaskRuntimeLogger} from './TaskRuntimeLogger';
import {TaskRunner} from './TaskRunner';
import {ILoggerApi} from '../logging/ILoggerApi';
import {TaskState} from './TaskState';


export class TaskRuntimeContainer implements ITaskRuntimeContainer {

  private readonly $_run_: TaskRun;

  private $progress = 0;

  private $total = 100;

  private _logger: ILoggerApi;


  constructor(taskRun: TaskRun) {
    this.$_run_ = taskRun;
    this.$total = 100;
  }

  /**
   * Get internal statistic counter
   *
   * @param key
   */
  counter(key: string) {
    return this.$_run_.status.counters.get(key);
  }


  logger() {
    if (!this._logger) {
      this._logger = new TaskRuntimeLogger(
        this.getRunner().id,
        this.$_run_.taskRef().name,
        this.$_run_.nr,
        this.getRunner().getLogger());
    }
    return this._logger;
  }


  private getRunner(): TaskRunner {
    return this.$_run_.getRunner();
  }


  addTask(name: string, incomings?: any): Promise<TaskState> {
    const taskRun = this.$_run_.getRunner().createTaskRun(name, incomings);
    this.$_run_.getRunner().enqueue(taskRun);
    return taskRun.asPromise();
  }


  progress(nr: number) {
    this.$progress = nr;
    this.$_run_.update();
  }


  total(nr: number) {
    this.$total = nr;
  }


  done() {
    this.$progress = this.$total;
  }


  get name() {
    return this.$_run_.taskRef().name;
  }


  get id() {
    return this.$_run_.nr;
  }


  get taskNr() {
    return this.$_run_.nr;
  }

  get runnerId() {
    return this.$_run_.getRunner().id;
  }


  stats() {
    const obj = this.$_run_.status.counters.asObject();
    _.assign(obj, {
      progress: this.$progress,
      total: this.$total
    });
    return obj;
  }

}


