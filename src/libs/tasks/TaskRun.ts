import * as _ from "lodash";
import {Task} from "./Task";
import {TaskObject} from "./TaskObject";
import {TaskRunner} from "./TaskRunner";
import {Log} from "../logging/Log";

export class TaskRun {

  static taskId: number = 0;

  id: number;

  $root: any;

  $runner: any;

  $initialized: any;

  $enabled: boolean;

  $done: boolean;

  $running: boolean;

  $error: Error;

  $result:any = null;

  $dependencies: any;

  $subtasks: any;

  $task: Task;
  $wrapper: TaskObject;

  $created: Date;
  $start: Date;
  $stop: Date;
  $duration: number;

  constructor(runner: TaskRunner, task: Task) {
    this.id = TaskRun.taskId++;
    this.$root = false;
    this.$runner = runner;
    this.$initialized = false;

    this.$enabled = false;
    this.$done = false;
    this.$running = false;
    this.$error = null;


    this.$dependencies = task.dependencies();

    // task that should run before this task! (passing values!!!)
    this.$subtasks = task.subtasks();


    this.$task = task;

    this.$created = new Date();
    this.$start = null;
    this.$stop = null;
    this.$duration = null;

  }


  task() {
    return this.$task
  }


  ready() {
    if (!this.$done && !this.$running) {
      // console.log(this.$task.$name)
      if (this.$runner.areTasksDone(this.$subtasks) && this.$runner.areTasksDone(this.$dependencies)) {
        return true;
      }
    }
    return false;
  }


  start(done: Function) {
    this.$running = true;
    this.$start = new Date();
    this.$wrapper = new TaskObject(this);

    if (this.$runner.$dry_mode) {
      Log.info('dry start: ' + this.task().name());
      let func = function (d: Function) {
        d()
      };
      func.call(this.$wrapper, done);
    } else {
      Log.info('task start: ' + this.task().name());
      this.$task.$fn.call(this.$wrapper, done);

    }

  }


  stop() {
    Log.info('dry stop: ' + this.task().name());
    this.$done = true;
    this.$running = false;

    this.$stop = new Date();
    this.$duration = this.$stop.getTime() - this.$start.getTime();
  }

  stats() {

    let stats = {
      name: this.task().name(),
      id: this.id,
      created: this.$created,
      start: this.$start,
      stop: this.$stop,
      duration: this.$duration,
      result: this.$result,
      has_error: this.$error != null,
      error: this.$error
    };


    return _.merge(stats, this.$wrapper.stats);

  }

}


