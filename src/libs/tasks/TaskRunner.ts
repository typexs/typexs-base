import * as _ from 'lodash';
import {EventEmitter} from 'events';
import {Tasks} from './Tasks';
import {TaskRun} from './TaskRun';
import {Log} from '../logging/Log';
import {
  TASK_RUNNER_SPEC,
  TASK_STATES,
  TASKRUN_STATE_DONE,
  TASKRUN_STATE_FINISH_PROMISE,
  TASKRUN_STATE_FINISHED,
  TASKRUN_STATE_NEXT,
  TASKRUN_STATE_RUN,
  TASKRUN_STATE_UPDATE
} from './Constants';
import {ITaskRunnerResult} from './ITaskRunnerResult';
import {Bootstrap} from '../../Bootstrap';
import {Invoker} from '../../base/Invoker';
import {TasksHelper} from './TasksHelper';
import {Container} from 'typedi';
import {ILoggerApi} from '../logging/ILoggerApi';
import * as moment from 'moment';
import {WinstonLoggerJar} from '../logging/WinstonLoggerJar';

import * as winston from 'winston';
import {DefaultJsonFormat} from '../logging/DefaultJsonFormat';

import {Stream} from 'stream';
import {ITaskRunnerOptions} from './ITaskRunnerOptions';
import {CryptUtils} from '../utils/CryptUtils';
import {TasksApi} from '../../api/Tasks.api';


export class TaskRunner extends EventEmitter {

  static taskRunnerId = 0;

  nr: number = TaskRunner.taskRunnerId++;

  id: string;

  taskNrs = 0;

  $options: ITaskRunnerOptions;

  $registry: Tasks;

  $parallel: any;

  $dry_mode: any;

  $tasks: TaskRun[] = [];

  private todoNrs: number[] = [];

  private runningNrs: number[];

  private doneNrs: number[];

  $finished: any;

  $start: Date;

  $stop: Date;

  $duration: number;

  $finish: Function = null;

  $incoming: any = {};

  $outgoing: any = {};

  state: TASK_STATES = 'proposed';

  private invoker: Invoker;

  private loggerName: string;

  private taskLogger: ILoggerApi;

//  private taskLoggerFile: string;

  writeStream: NodeJS.WritableStream;

  readStream: NodeJS.ReadableStream;


  constructor(registry: Tasks, names: TASK_RUNNER_SPEC[], options: ITaskRunnerOptions = null) {
    super();

    this.$options = options || <any>{};
    _.defaults(this.$options, {
      nodeId: Bootstrap.getNodeId(),
      targetIds: [Bootstrap.getNodeId()]
    });
    this.invoker = Container.get(Invoker.NAME);

    // id can be overwriten
    this.$start = new Date();

    const dateStr = moment(this.$start).format('YYYYMMDD-HHmmssSSS');
    this.id = _.get(options, 'id', dateStr + '-' + CryptUtils.shorthash(names.join(';') + Math.random()).substr(1));

    this.$registry = registry;
    this.$parallel = this.$options['parallel'] || 5;
    // this.$inital = names;
    this.$dry_mode = this.$options['dry_mode'] || false;


    this.todoNrs = [];
    this.runningNrs = [];
    this.doneNrs = [];

    this.resolveDeps(names);
    this.$tasks = _.orderBy(this.$tasks, ['$weight', 1]);


    this.$finished = false;

    this.todoNrs = this.$tasks.map(x => x.nr);
    this.loggerName = 'task-runner-' + this.id;
    const startDate = moment(this.$start).toISOString();
    this.taskLogger = Log._().createLogger(this.loggerName, {
      prefix: this.loggerName,
      taskStart: startDate,
      taskId: this.id,
      taskNames: this.todoNrs.join('--')
    });
    this.taskLogger.info('execute tasks: ' + this.$tasks.map(t => t.taskRef().name).join(', '));

    const sefl = this;
    this.readStream = new Stream.Readable({
      read(size: number) {
        return size > 0;
      }
    });

    this.writeStream = new Stream.Writable({
      write(chunk: any, encoding: any, next: any) {
        (<any>sefl.readStream).push(chunk, encoding);
        next();
      }
    });


    (<WinstonLoggerJar>this.taskLogger).logger().add(
      new winston.transports.Stream({
        stream: this.writeStream,
        format: new DefaultJsonFormat()
      }));


    // this.$todo = _.keys(this.$tasks);

    this.on(TASKRUN_STATE_FINISHED, this.finish.bind(this));
    this.on(TASKRUN_STATE_NEXT, this.next.bind(this));
    this.on(TASKRUN_STATE_RUN, this.taskRun.bind(this));
    this.on(TASKRUN_STATE_DONE, this.taskDone.bind(this));

    this.state = 'started';
  }

  getOption(key: string, defaultValue?: any) {
    return _.get(this.$options, key, defaultValue);
  }

  getOptions() {
    return this.$options;
  }


  taskInc() {
    return this.taskNrs++;
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
    const ref = this.getRequiredIncomings().find(i => i.storingName === _.snakeCase(key));
    if (ref) {
      _.set(this.$incoming, ref.storingName, await ref.convert(value));
    } else {
      this.getLogger().warn('no required incoming parameter found for ' + key);
    }
  }


  /**
   * Check if subtask or depending tasks are ready
   */
  selectNextTask() {
    for (const taskRun of this.$tasks) {
      if (taskRun.ready()) {
        return taskRun;
      }
    }
    return null;
  }


  resolveDeps(task_names: TASK_RUNNER_SPEC[], parent?: TaskRun, variant?: 'subs' | 'deps') {
    for (let i = 0; i < task_names.length; i++) {
      const name = task_names[i];
      const taskRun = _.isString(name) ? this.createTaskRun(name) : this.createTaskRun(name.name, name.incomings);

      if (parent) {
        if (variant === 'deps') {
          parent.dependencyTaskNrs.push(taskRun.nr);
        } else if (variant === 'subs') {
          parent.subTaskNrs.push(taskRun.nr);
        }
      }
    }
  }


  createTaskRun(name: string, incomings: any = {}) {
    const task = this.$registry.get(name);
    const taskRun = new TaskRun(this, task, incomings);
    this.$tasks.push(taskRun);

    if (taskRun.subTaskNames.length > 0) {
      taskRun.addWeight(taskRun.subTaskNames.length);
      const subTaskNames = taskRun.subTaskNames.filter(tn => !this.$tasks.find(t => t.taskRef().name === tn));
      if (subTaskNames) {
        this.resolveDeps(taskRun.subTaskNames, taskRun, 'subs');
      }
    }

    if (taskRun.dependencyTaskNames.length > 0) {
      taskRun.addWeight(taskRun.dependencyTaskNames.length);
      const dependencyTaskNames = taskRun.dependencyTaskNames.filter(tn => !this.$tasks.find(t => t.taskRef().name === tn));
      if (dependencyTaskNames) {
        this.resolveDeps(taskRun.dependencyTaskNames, taskRun, 'deps');
      }
    }
    return taskRun;
  }


  enqueue(taskRun: TaskRun) {
    this.taskLogger.debug('enqueue task at runtime ' + taskRun.taskRef().name);
    this.todoNrs.push(taskRun.nr);
    this.next();
  }


  areTasksDone(tasksNrs: number[]) {
    // console.log('check',tasks, 'done',this.$done)
    for (let i = 0; i < tasksNrs.length; i++) {
      const tName = tasksNrs[i];
      if (this.doneNrs.indexOf(tName) === -1) {
        // not done
        return false;
      }
    }
    return true;
  }


  next() {
    const self = this;
    if (this.$finished) {
      return;
    }

    if (this.todoNrs.length === 0 && this.runningNrs.length === 0) {
      this.$finished = true;
      self.emit(TASKRUN_STATE_FINISHED);
      return;
    }

    const nextTask = this.selectNextTask();
    this.state = 'running';
    if (this.runningNrs.length === 0 && !nextTask) {
      throw new Error('Tasks are stucked!');
    }

    if (nextTask) {
      if (this.runningNrs.length < this.$parallel) {
        self.emit(TASKRUN_STATE_RUN, nextTask);
      }
    }
  }


  api() {
    return this.invoker.use(TasksApi);
  }


  taskRun(taskRun: TaskRun) {
    const self = this;
    const nr = taskRun.nr; // taskRef().name;

    const ridx = this.runningNrs.indexOf(nr);
    if (ridx === -1) {
      this.runningNrs.push(nr);
    } else {
      throw new Error('TaskRef already running!!!');
    }

    const idx = this.todoNrs.indexOf(nr);
    if (idx === -1) {
      throw new Error('TaskRef not in todo list!');
    }
    this.todoNrs.splice(idx, 1);

    const doneCallback = function (err: Error, res: any) {
      if (err) {
        self.taskLogger.error(err);
      }
      taskRun.error(err);
      taskRun.result(res);
      self.emit(TASKRUN_STATE_DONE, taskRun, err);
    };

    const incoming: any = {};
    taskRun.taskRef().getIncomings().forEach(x => {
      if (!_.isUndefined(this.$incoming[x.storingName]) || !_.isUndefined(this.$outgoing[x.storingName])) {
        incoming[x.name] = this.$incoming[x.storingName] || this.$outgoing[x.storingName];
      } else if (x.hasOption('default')) {
        incoming[x.name] = x.getOptions('default', undefined);
      }
    });

    taskRun.start(doneCallback, incoming);
    self.emit(TASKRUN_STATE_NEXT);
  }


  taskDone(taskRun: TaskRun, err: Error = null) {
    taskRun.stop();

    // copy outgoings to incomings
    taskRun.taskRef().getOutgoings().forEach(x => {
      this.$outgoing[x.storingName] = taskRun.status.outgoing[x.name];
    });

    const nr = taskRun.nr;

    const ridx = this.doneNrs.indexOf(nr);
    if (ridx === -1) {
      this.doneNrs.push(nr);
    } else {
      throw new Error('TaskRef already in done list!!!');
    }

    const idx = this.runningNrs.indexOf(nr);
    if (idx === -1) {
      throw new Error('TaskRef not in running list!');
    }
    this.runningNrs.splice(idx, 1);

    if (err) {
      taskRun.error(err);
    }

    this.emit(TASKRUN_STATE_NEXT);
  }


  async run(cb?: Function): Promise<ITaskRunnerResult> {
    this.$finish = cb;

    this.api().onBefore(this);

    return new Promise((resolve, reject) => {
      // TODO timeout?
      this.once(TASKRUN_STATE_FINISH_PROMISE, async (x: any) => {
        if (_.isError(x)) {
          this.api().onError(this);
          reject(x);
        } else {
          this.api().onAfter(this);
          resolve(x);
        }
      });

      this.emit(TASKRUN_STATE_NEXT);
    });
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
    return this.$tasks.map(t => t.taskRef().name);
  }


  update(taskName: string) {
    this.emit(TASKRUN_STATE_UPDATE, taskName, this.collectStats());
  }


  finish() {
    this.state = 'stopped';
    this.$stop = new Date();
    this.$duration = this.$stop.getTime() - this.$start.getTime();
    const status = this.collectStats();

    if (this.$finish) {
      this.$finish(status);
    }
    this.taskLogger.close();
    this.writeStream.end();
    this.emit(TASKRUN_STATE_FINISH_PROMISE, status);
  }


  collectStats(taskName: string = null): ITaskRunnerResult {
    // todo collect results
    const results = [];
    for (const task of this.$tasks) {
      results.push(task.stats());
    }

    const status: ITaskRunnerResult = {
      id: this.id,
      state: this.state,
      nodeId: this.$options.nodeId,
      targetIds: this.$options.targetIds,
      start: this.$start,
      stop: this.$stop,
      duration: this.$duration,
      tasks: this.getList(),
      results: results
    };
    return status;
  }


  async finalize() {
    // TODO ...
  }

}

