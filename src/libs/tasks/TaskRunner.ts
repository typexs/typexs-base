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
  TASKRUN_STATE_RUN,
  TASKRUN_STATE_UPDATE
} from "./Constants";
import {ITaskRunnerResult} from "./ITaskRunnerResult";
import {CryptUtils, TasksApi} from "../..";
import {Invoker} from '../../base/Invoker';
import {TasksHelper} from "./TasksHelper";
import {Container} from "typedi";
import {ILoggerApi} from "../logging/ILoggerApi";
import * as moment from "moment";
import {WinstonLoggerJar} from "../logging/WinstonLoggerJar";

import * as winston from "winston";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {DefaultJsonFormat} from "../logging/DefaultJsonFormat";

import {Stream} from "stream";


export class TaskRunner extends EventEmitter {

  static taskRunnerId: number = 0;

  nr: number = TaskRunner.taskRunnerId++;

  id: string;

  $options: any;

  $registry: Tasks;

  $parallel: any;

  $dry_mode: any;

  $tasks: TaskRun[] = [];

  $todo: string[] = [];

  $running: string[];

  $done: string[];

  $finished: any;

  $start: Date;

  $stop: Date;

  $duration: number;

  $finish: Function = null;

  $incoming: any = {};

  $outgoing: any = {};

  private invoker: Invoker;

  private loggerName: string;

  private taskLogger: ILoggerApi;

  private taskLoggerFile: string;

  writeStream: NodeJS.WritableStream;

  readStream: NodeJS.ReadableStream;


  constructor(registry: Tasks, names: string[], options: any = {}) {
    super();

    this.invoker = Container.get(Invoker.NAME);

    // id can be overwriten
    this.id = _.get(options, 'id', CryptUtils.shorthash(names.join(';') + ';' + this.nr + Date.now()));

    this.$options = options || {};

    this.$registry = registry;
    this.$parallel = this.$options['parallel'] || 5;
    //this.$inital = names;
    this.$dry_mode = this.$options['dry_mode'] || false;
    this.$start = new Date();

    this.resolveDeps(names);
    this.$tasks = _.orderBy(this.$tasks, ['$weight', 1]);

    this.$todo = [];
    this.$running = [];
    this.$done = [];

    this.$finished = false;

    this.$todo = this.$tasks.map(x => x.taskRef().name);
    this.loggerName = 'task-runner-' + this.id;
    let startDate = moment(this.$start).toISOString();
    this.taskLogger = Log._().createLogger(this.loggerName, {
      prefix: this.loggerName,
      taskStart: startDate,
      taskId: this.id,
      taskNames: this.$todo.join('--')
    });
    this.taskLogger.info('Execute tasks: ' + this.$todo.join(', '));

    this.taskLoggerFile = path.join(os.tmpdir(), 'typexs-taskrun-' + this.id + '-' + startDate);

    let sefl = this;
    this.readStream = new Stream.Readable({
      read(size:number) {
        return size > 0 ;
      }
    });

    this.writeStream = new Stream.Writable({
      write (chunk: any, encoding: any, next: any)  {
        (<any>sefl.readStream).push(chunk, encoding);
        next()
      }
    });


    (<WinstonLoggerJar>this.taskLogger).logger().add(
      new winston.transports.Stream({
        stream: this.writeStream,
        format: new DefaultJsonFormat()
      }));

    (<WinstonLoggerJar>this.taskLogger).logger().add(
      new winston.transports.Stream({
        stream: fs.createWriteStream(this.taskLoggerFile, {}),
        format: new DefaultJsonFormat()
      }));

    //this.$todo = _.keys(this.$tasks);

    this.on(TASKRUN_STATE_FINISHED, this.finish.bind(this));
    this.on(TASKRUN_STATE_NEXT, this.next.bind(this));
    this.on(TASKRUN_STATE_RUN, this.taskRun.bind(this));
    this.on(TASKRUN_STATE_DONE, this.taskDone.bind(this))
  }


  getLogFile() {
    return this.taskLoggerFile;
  }


  getLogger() {
    return this.taskLogger;
  }


  getReadStream() {
    return this.readStream;
  }


  /**
   * Get all necassary incoming parameter
   *
   * @param itersect
   */
  getRequiredIncomings(withoutPassThrough: boolean = false) {
    return TasksHelper.getRequiredIncomings(this.$tasks.map(tr => tr.taskRef()), withoutPassThrough);
  }


  async setIncoming(key: string, value: any) {
    let ref = this.getRequiredIncomings().find(i => i.storingName == _.snakeCase(key));
    if (ref) {
      _.set(this.$incoming, ref.storingName, await ref.convert(value));
    } else {
      this.getLogger().warn('no required incoming parameter found for ' + key)
    }
  }


  /**
   * Check if subtask or depending tasks are ready
   */
  selectNextTask() {
    for (let taskRun of this.$tasks) {
      if (taskRun.ready()) {
        return taskRun;
      }
    }
    return null;
  }


  resolveDeps(task_names: string[]) {
    for (let i = 0; i < task_names.length; i++) {
      let name = task_names[i];
      let taskRun = _.find(this.$tasks, x => x.taskRef().name == name);
      if (taskRun) continue;

      let task = this.$registry.get(name);
      taskRun = new TaskRun(this, task);
      this.$tasks.push(taskRun);

      if (taskRun.$subtasks.length > 0) {
        taskRun.addWeight(taskRun.$subtasks.length);
        this.resolveDeps(taskRun.$subtasks);
      }

      if (taskRun.$dependencies.length > 0) {
        taskRun.addWeight(taskRun.$dependencies.length);
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


  api() {
    return this.invoker.use(TasksApi)
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
        self.taskLogger.error(err);
      }
      taskRun.error(err);
      taskRun.result(res);
      self.emit(TASKRUN_STATE_DONE, taskRun, err);
    };

    let incoming: any = {};
    taskRun.taskRef().getIncomings().forEach(x => {
      incoming[x.name] = this.$incoming[x.storingName] || this.$outgoing[x.storingName];
    });

    await taskRun.start(doneCallback, incoming);
    self.emit(TASKRUN_STATE_NEXT);
  }


  taskDone(task: TaskRun, err: Error = null) {
    task.stop();

    // copy outgoings to incomings
    task.taskRef().getOutgoings().forEach(x => {
      this.$outgoing[x.storingName] = task.status.outgoing[x.name];
    });

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
      task.error(err);
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
    return this.$tasks.map(t => t.taskRef().name)
  }


  update(taskName: string) {
    this.emit(TASKRUN_STATE_UPDATE, taskName, this.collectStats())
  }


  finish() {
    this.$stop = new Date();
    this.$duration = this.$stop.getTime() - this.$start.getTime();

    let status = this.collectStats();

    if (this.$finish) {
      this.$finish(status);
    }

    this.taskLogger.close();
    this.writeStream.end();
    //this.writeStream = null;
    //this.readStream.emit('close');
    //(<any>this.readStream).destroy();
    //this.writeStream = null;
    this.emit(TASKRUN_STATE_FINISH_PROMISE, status);
  }


  collectStats(taskName: string = null) {
    // todo collect results
    let results = [];
    for (let task of this.$tasks) {
      results.push(task.stats());
    }

    let status = {
      start: this.$start,
      stop: this.$stop,
      duration: this.$duration,
      tasks: this.getList(),
      results: results
    };
    return status;
  }


  async finalize() {
    if (fs.existsSync(this.taskLoggerFile)) {
      await new Promise((resolve, reject) => {
        fs.unlink(this.taskLoggerFile, resolve);
      })
    }
  }

}

