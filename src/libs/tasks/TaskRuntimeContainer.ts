import * as _ from 'lodash';
import {TaskRun} from "./TaskRun";
import {ITaskRuntimeContainer} from "./ITaskRuntimeContainer";

import {TaskRuntimeLogger} from "./TaskRuntimeLogger";
import {TaskRunner} from "./TaskRunner";
import {ILoggerApi} from "../logging/ILoggerApi";


export class TaskRuntimeContainer implements ITaskRuntimeContainer {

  private readonly $_run_: TaskRun;

  private $progress: number = 0;

  private $total: number = 100;

  private _logger: ILoggerApi;


  constructor(taskRun: TaskRun) {
    this.$_run_ = taskRun;
    this.$total = 100;
  }


  logger() {
    if (!this._logger) {
      this._logger = new TaskRuntimeLogger(this.getRunner().id, this.$_run_.taskRef().name, this.$_run_.id, this.getRunner().getLogger());
    }
    return this._logger;
  }


  private getRunner(): TaskRunner {
    return this.$_run_.getRunner()
  }


  progress(nr: number) {
    this.$progress = nr;
    this.$_run_.update();
    //Log.debug(this.name + ': ' + Math.round((this.$progress / this.$total) * 100) +'%');
  }

  /*
  info(...args: any[]) {
    this.getRunner().getLogger()
  }
  */


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
    return this.$_run_.id;
  }


  stats() {
    return {
      progress: this.$progress,
      total: this.$total
    }
  }
}


