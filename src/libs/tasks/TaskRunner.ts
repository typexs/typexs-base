import {EventEmitter} from 'events'
import {Tasks} from "./Tasks";
import {TaskRun} from "./TaskRun";
import {Log} from "../logging/Log";


export class TaskRunner extends EventEmitter {

  static taskRunnerId: number = 0;

  $options: any;
  $id: any;
  $registry: Tasks;
  $parallel: any;
  $dry_mode: any;
  $tasks: any;
  $todo: any;
  $running: any;
  $done: any;
  $finished: any;
  $start: Date;
  $stop: Date;
  $duration: number;
  $finish: Function = null;

  constructor(registry: Tasks, names: string[], options: any = {}) {
    super();
    this.$options = options || {};
    this.$id = TaskRunner.taskRunnerId++;
    this.$registry = registry;
    this.$parallel = this.$options['parallel'] || 3;
    //this.$inital = names;
    this.$dry_mode = this.$options['dry_mode'] || false;
    this.$start = new Date();
    this.$tasks = {};

    this.$todo = [];
    this.$running = [];
    this.$done = [];

    this.$finished = false;

    this.resolveDeps(names);

    this.$todo = Object.keys(this.$tasks);


    let self = this;

    this.on(Tasks.CONST.EVENTS.FINISHED, function () {
      self.finish();
    });

    this.on(Tasks.CONST.EVENTS.NEXT, function () {
      self.next();
    });

    this.on(Tasks.CONST.EVENTS.TASK_RUN, function (taskRun) {
      self.taskRun(taskRun);
    });

    this.on(Tasks.CONST.EVENTS.TASK_DONE, function (taskRun) {
      self.taskDone(taskRun);
    })

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
      self.emit(Tasks.CONST.EVENTS.FINISHED);
      return;
    }

    let nextTask = this.selectNextTask();

    if (this.$running.length == 0 && !nextTask) {
      throw new Error('Tasks are stucked!')
    }

    if (nextTask) {
      if (this.$running.length < this.$parallel) {
        self.emit(Tasks.CONST.EVENTS.TASK_RUN, nextTask);
      }
    }

  }


  taskRun(taskRun: TaskRun) {
    let self = this;


    let name = taskRun.task().name();

    let ridx = this.$running.indexOf(name);
    if (ridx == -1) {
      this.$running.push(name);
    } else {
      throw new Error('Task already running!!!');
    }


    let idx = this.$todo.indexOf(name);
    if (idx == -1) {
      throw new Error('Task not in todo list!');
    }
    this.$todo.splice(idx, 1);

    let doneCallback = function (err: Error, res: any) {
      if (err) {
        Log.error(err);
      }
      taskRun.$error = err;
      taskRun.$result = res;
      self.emit(Tasks.CONST.EVENTS.TASK_DONE, taskRun, err);
    };

    taskRun.start(doneCallback);

    self.emit(Tasks.CONST.EVENTS.NEXT);
  }


  taskDone(task: TaskRun, err: Error = null) {
    task.stop();

    let name = task.task().name();

    let ridx = this.$done.indexOf(name);
    if (ridx == -1) {
      this.$done.push(name);
    } else {
      throw new Error('Task already in done list!!!');
    }

    let idx = this.$running.indexOf(name);
    if (idx == -1) {
      throw new Error('Task not in running list!');
    }
    this.$running.splice(idx, 1);

    if (err) {
      task.$error = err;
    }

    this.emit(Tasks.CONST.EVENTS.NEXT);
  }


  run(cb: Function) {
    this.$finish = cb;
    this.emit(Tasks.CONST.EVENTS.NEXT);
  }

  runDry(cb: Function) {
    this.$dry_mode = true;
    this.$finish = cb;
    this.emit(Tasks.CONST.EVENTS.NEXT);
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

    this.$stop = new Date();
    this.$duration = this.$stop.getTime() - this.$start.getTime();

    // todo collect results
    let results = [];
    for (let t in this.$tasks) {
      let task = this.$tasks[t];
      results.push(task.stats())
    }

    if (this.$finish) {
      this.$finish({
        start: this.$start,
        stop: this.$start,
        duration: this.$duration,
        results: results
      });
    }

  }

}

