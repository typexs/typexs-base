import * as _ from 'lodash';
import {TaskRef} from './TaskRef';
import {TaskRuntimeContainer} from './TaskRuntimeContainer';
import {TaskRunner} from './TaskRunner';
import {TaskExchangeRef} from './TaskExchangeRef';
import {NotSupportedError} from 'commons-base';
import {ITaskRunResult} from './ITaskRunResult';
import {TaskState} from './TaskState';

export class TaskRun {

  nr: number;

  $root: any;

  private $runner: TaskRunner;

  dependencyTaskNames: string[] = [];

  dependencyTaskNrs: number[] = [];

  subTaskNames: string[] = [];

  subTaskNrs: number[] = [];

  private $taskRef: TaskRef;

  private $wrapper: TaskRuntimeContainer;

  readonly status: TaskState = new TaskState();

  /**
   * Incoming values for this task
   */
  incomings: { [k: string]: any } = {};


  constructor(runner: TaskRunner, taskRef: TaskRef, incomings: any = {}) {
    this.nr = runner.taskInc();
    this.$root = false;
    this.$runner = runner;
    // taskRefs that should run after this taskRef
    this.dependencyTaskNames = taskRef.dependencies();
    this.incomings = incomings;

    // taskRef that should run before this taskRef! (passing values!!!)
    this.subTaskNames = taskRef.subtasks();
    this.$taskRef = taskRef;

    this.status.tasksId = runner.id;
    this.status.name = taskRef.name;
    this.status.nr = this.nr;

    this.$wrapper = new TaskRuntimeContainer(this);

  }


  getTaskName() {
    return this.$taskRef.name;
  }


  taskRef() {
    return this.$taskRef;
  }


  getRunner() {
    return this.$runner;
  }


  isRunning() {
    return this.status.running;
  }


  isDone() {
    return this.status.done;
  }


  ready() {
    if (!this.isDone() && !this.isRunning()) {
      if (this.$runner.areTasksDone(this.subTaskNrs) &&
        this.$runner.areTasksDone(this.dependencyTaskNrs)) {
        return true;
      }
    }
    return false;
  }


  async start(done: (err: Error, res: any) => void, incoming: { [k: string]: any }) {

    this.status.running = true;
    this.status.start = new Date();
    this.$runner.api().onStart(this);

    incoming = _.clone(incoming) || {};
    _.assign(incoming, this.incomings); // Overwrite with initial incomings
    this.incomings = incoming;

    if (this.$runner.$dry_mode) {
      this.$wrapper.logger().debug('dry taskRef start: ' + this.taskRef().name);
      const func = function (d: Function) {
        d();
      };
      func.call(this.$wrapper, done);
    } else {
      this.$wrapper.logger().debug('taskRef start: ' + this.taskRef().name);
      const outgoings: TaskExchangeRef[] = this.taskRef().getOutgoings();

      this.status.incoming = _.clone(incoming);

      // let _incoming = this.$incoming;
      const runtimeReference = this.taskRef().getRuntime();
      if (runtimeReference) {
        incoming[runtimeReference.name] = this.$wrapper;
      }

      const [fn, instance] = this.taskRef().executable(incoming);
      if (_.isFunction(fn)) {
        if (fn.length === 0) {
          try {
            const res = await fn.call(this.$wrapper);
            outgoings.forEach(x => {
              this.status.outgoing[x.storingName] = instance[x.name];
            });
            done(null, res);
          } catch (e) {
            done(e, null);
          }
        } else {
          try {
            fn.call(this.$wrapper, (err: Error, res: any) => {
              outgoings.forEach(x => {
                this.status.outgoing[x.storingName] = instance[x.name];
              });
              done(err, res);
            });
          } catch (err) {
            done(err, null);
          }
        }
      } else {
        throw new NotSupportedError('no executable for ' + this.taskRef().name);
      }
    }
  }


  error(err: Error) {
    if (err) {
      this.status.error = err;
      this.status.has_error = true;
      this.$runner.api().onError(this);
    }
  }


  result(res: any) {
    this.status.result = res;
  }


  hasError() {
    return !!this.status.error;
  }


  stop() {
    this.$wrapper.logger().debug('stop: ' + this.taskRef().name);
    this.status.done = true;
    this.status.running = false;
    this.status.stop = new Date();
    this.status.calcDuration();

    this.$runner.api().onStop(this);

    this.$wrapper.done();
    this.getRunner().emit('task_' + this.nr + '_done');
  }


  asPromise(): Promise<TaskState> {
    return new Promise((resolve, reject) => {
      if (this.isDone()) {
        if (this.hasError()) {
          reject(this.status.error);
        } else {
          resolve(this.status);
        }
      } else {
        this.getRunner().once('task_' + this.nr + '_done', () => {
          if (this.hasError()) {
            reject(this.status.error);
          } else {
            resolve(this.status);
          }
        });
      }
    });
  }


  addWeight(nr: number) {
    this.status.weight += nr;
  }


  update() {
    this.$runner.api().onProgress(this);
    this.getRunner().update(this.taskRef().name);
  }


  stats() {
    const stats: ITaskRunResult = _.clone(this.status);
    return _.merge(stats, this.$wrapper.stats());
  }

}


