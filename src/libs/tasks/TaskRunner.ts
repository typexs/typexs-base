import * as _ from 'lodash';
import {EventEmitter} from 'events'
import {Tasks} from "./Tasks";
import {TaskRun} from "./TaskRun";
import {Log} from "../logging/Log";
import {
  TASKRUN_STATE_DONE,
  TASKRUN_STATE_FINISH_PROMISE,
  TASKRUN_STATE_FINISHED,
  TASKRUN_STATE_NEXT,
  TASKRUN_STATE_RUN
} from "./Constants";
import {ITaskRunnerResult} from "./ITaskRunnerResult";


export class TaskRunner extends EventEmitter {

  static taskRunnerId: number = 0;


  $options: any;

  $id: any;

  $registry: Tasks;

  $parallel: any;

  $dry_mode: any;

  $tasks: any;

  $todo: string[];

  $running: string[];

  $done: string[];

  $finished: any;

  $start: Date;

  $stop: Date;

  $duration: number;

  $finish: Function = null;

  $incoming: any = {};

  $outgoing: any = {};

  constructor(registry: Tasks, names: string[], options: any = {}) {
    super();

    this.$options = options || {};
    this.$id = TaskRunner.taskRunnerId++;
    this.$registry = registry;
    this.$parallel = this.$options['parallel'] || 5;
    //this.$inital = names;
    this.$dry_mode = this.$options['dry_mode'] || false;
    this.$start = new Date();
    this.$tasks = {};

    this.resolveDeps(names);

    this.$todo = [];
    this.$running = [];
    this.$done = [];

    this.$finished = false;
    this.$todo = _.keys(this.$tasks);

    this.on(TASKRUN_STATE_FINISHED, this.finish.bind(this));
    this.on(TASKRUN_STATE_NEXT, this.next.bind(this));
    this.on(TASKRUN_STATE_RUN, this.taskRun.bind(this));
    this.on(TASKRUN_STATE_DONE, this.taskDone.bind(this))
  }

  setIncoming(key: string, value: any) {
    _.set(this.$incoming, key, value);
  }


  selectNextTask() {
    for (let x in this.$tasks) {
      let t = this.$tasks[x];

      if (t.ready()) {
        return t
      }
    }
    return null;
  }


  resolveDeps(task_names: string[]) {
    for (let i = 0; i < task_names.length; i++) {
      let name = task_names[i];
      if (name in this.$tasks) {
        continue;
      }

      let task = this.$registry.get(name);
      let taskRun = new TaskRun(this, task);
      this.$tasks[name] = taskRun;

      if (taskRun.$subtasks.length > 0) {
        this.resolveDeps(taskRun.$subtasks);
      }

      if (taskRun.$dependencies.length > 0) {
        this.resolveDeps(taskRun.$dependencies);
      }
    }
  }


  areTasksDone(tasks: string[]) {
    // console.log('check',tasks, 'done',this.$done)
    for (let i = 0; i < tasks.length; i++) {
      let tName = tasks[i];
      if (this.$done.indexOf(tName) == -1) {
        // not done
        return false;
      }
    }
    return true;
  }


  next() {
    let self = this;
    if (this.$finished) {
      return;
    }

    if (this.$todo.length == 0 && this.$running.length == 0) {
      this.$finished = true;
      self.emit(TASKRUN_STATE_FINISHED);
      return;
    }

    let nextTask = this.selectNextTask();

    if (this.$running.length == 0 && !nextTask) {
      throw new Error('Tasks are stucked!')
    }

    if (nextTask) {
      if (this.$running.length < this.$parallel) {
        self.emit(TASKRUN_STATE_RUN, nextTask);
      }
    }

  }


  async taskRun(taskRun: TaskRun) {
    let self = this;
    let name = taskRun.taskRef().name;

    let ridx = this.$running.indexOf(name);
    if (ridx == -1) {
      this.$running.push(name);
    } else {
      throw new Error('TaskRef already running!!!');
    }


    let idx = this.$todo.indexOf(name);
    if (idx == -1) {
      throw new Error('TaskRef not in todo list!');
    }
    this.$todo.splice(idx, 1);

    let doneCallback = function (err: Error, res: any) {
      if (err) {
        Log.error(err);
      }
      taskRun.$error = err;
      taskRun.$result = res;
      self.emit(TASKRUN_STATE_DONE, taskRun, err);
    };

    await taskRun.start(doneCallback, this.$incoming);
    self.emit(TASKRUN_STATE_NEXT);
  }


  taskDone(task: TaskRun, err: Error = null) {
    task.stop();

    // copy outgoings to incomings
    _.assign(this.$incoming, task.$outgoing);

    let name = task.taskRef().name;

    let ridx = this.$done.indexOf(name);
    if (ridx == -1) {
      this.$done.push(name);
    } else {
      throw new Error('TaskRef already in done list!!!');
    }

    let idx = this.$running.indexOf(name);
    if (idx == -1) {
      throw new Error('TaskRef not in running list!');
    }
    this.$running.splice(idx, 1);

    if (err) {
      task.$error = err;
    }

    this.emit(TASKRUN_STATE_NEXT);
  }


  run(cb?: Function): Promise<ITaskRunnerResult> {
    this.$finish = cb;

    return new Promise((resolve, reject) => {
      // TODO timeout?
      this.once(TASKRUN_STATE_FINISH_PROMISE, (x: any) => {
        if (_.isError(x)) {
          reject(x);
        } else {
          resolve(x);
        }
      });
      this.emit(TASKRUN_STATE_NEXT);
    })
  }

  runDry(cb?: Function): Promise<ITaskRunnerResult> {
    this.$dry_mode = true;
    this.$finish = cb;

    return new Promise((resolve, reject) => {

      // TODO timeout?
      this.once(TASKRUN_STATE_FINISH_PROMISE, (x: any) => {
        if (_.isError(x)) {
          reject(x);
        } else {
          resolve(x);
        }
      });
      this.emit(TASKRUN_STATE_NEXT);
    });
  }


  getList() {
    let tasks = {};
    for (let i in this.$tasks) {
      tasks[i] = [];
      let t = this.$tasks[i];
      tasks[i] = tasks[i].concat(t.$dependencies);
      tasks[i] = tasks[i].concat(t.$subtasks)
    }

    return tasks
  }


  finish() {
    Log.debug('finished ', _.keys(this.$tasks));
    this.$stop = new Date();
    this.$duration = this.$stop.getTime() - this.$start.getTime();

    // todo collect results
    let results = [];
    for (let t in this.$tasks) {
      let task = this.$tasks[t];
      results.push(task.stats())
    }

    let status = {
      start: this.$start,
      stop: this.$start,
      duration: this.$duration,
      results: results
    }

    if (this.$finish) {
      this.$finish(status);
    }

    this.emit(TASKRUN_STATE_FINISH_PROMISE, status);

  }

}

