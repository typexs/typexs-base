import * as _ from "lodash";
import {TaskRef} from "./TaskRef";
import {TaskRuntimeContainer} from "./TaskRuntimeContainer";
import {TaskRunner} from "./TaskRunner";
import {Log} from "../logging/Log";
import {TaskExchangeRef} from "./TaskExchangeRef";
import {NotSupportedError} from "commons-base";
import {ITaskRunResult} from "./ITaskRunResult";

import {TasksApi} from "../..";
import {TaskState} from "./TaskState";

export class TaskRun {

  static taskId: number = 0;


  id: number;

  $root: any;

  private $runner: TaskRunner;

  // $initialized: any;

  // $enabled: boolean;

  // $done: boolean;
  /*
    $incoming: any = {};

    $outgoing: any = {};


    $running: boolean;

    $error: Error;

    $result: any;
  */
  $dependencies: string[];

  $subtasks: any;

  private $taskRef: TaskRef;

  private $wrapper: TaskRuntimeContainer;

  readonly status: TaskState;


  constructor(runner: TaskRunner, taskRef: TaskRef) {
    this.id = TaskRun.taskId++;
    this.$root = false;
    this.$runner = runner;
    // this.$initialized = false;
    // this.$enabled = false;

    this.$dependencies = taskRef.dependencies();

    // taskRef that should run before this taskRef! (passing values!!!)
    this.$subtasks = taskRef.subtasks();
    this.$taskRef = taskRef;
    this.status = new TaskState();
    this.status.name = taskRef.name;
    this.status.pid = runner.id;

    this.$wrapper = new TaskRuntimeContainer(this);
  }


  taskRef() {
    return this.$taskRef
  }


  getRunner() {
    return this.$runner;
  }

  isRunning() {
    return this.status.running
  }

  isDone() {
    return this.status.done
  }

  ready() {
    if (!this.isDone() && !this.isRunning()) {
      if (this.$runner.areTasksDone(this.$subtasks) && this.$runner.areTasksDone(this.$dependencies)) {
        return true;
      }
    }
    return false;
  }


  async start(done: (err: Error, res: any) => void, incoming: { [k: string]: any }) {

    this.status.running = true;
    this.status.start = new Date();
    this.$runner.api().onStart(this.status);

    if (this.$runner.$dry_mode) {
      Log.debug('dry taskRef start: ' + this.taskRef().name);
      let func = function (d: Function) {
        d();
      };
      func.call(this.$wrapper, done);
    } else {
      Log.debug('taskRef start: ' + this.taskRef().name);
      let outgoings: TaskExchangeRef[] = this.taskRef().getOutgoings();

      this.status.incoming = _.clone(incoming);

      //let _incoming = this.$incoming;
      let runtimeReference = this.taskRef().getRuntime();
      if (runtimeReference) {
        incoming[runtimeReference.name] = this.$wrapper;
      }

      const [fn, instance] = this.taskRef().executable(incoming);
      if (_.isFunction(fn)) {
        if (fn.length == 0) {
          try {
            let res = await fn.call(this.$wrapper);
            outgoings.forEach(x => {
              this.status.outgoing[x.storingName] = instance[x.name];
            });
            done(null, res);
          } catch (e) {
            done(e, null);
          }
        } else {
          fn.call(this.$wrapper, (err: Error, res: any) => {
            outgoings.forEach(x => {
              this.status.outgoing[x.storingName] = instance[x.name];
            });
            done(err, res);
          });
        }
      } else {
        throw new NotSupportedError('no executable for ' + this.taskRef().name)
      }
    }
  }

  error(err: Error) {
    this.status.error = err;
    this.$runner.api().onError(this.status);
  }

  result(res: any) {
    this.status.result = res;
  }

  hasError() {
    return !!this.status.error;
  }

  stop() {
    Log.debug('stop: ' + this.taskRef().name);
    this.status.done = true;
    this.status.running = false;
    this.status.stop = new Date();
    this.status.calcDuration();

    this.$runner.api().onStop(this.status);

    this.$wrapper.done();
  }


  addWeight(nr: number) {
    this.status.weight += nr;
  }

  update() {
    this.getRunner().update(this.taskRef().name);
  }


  stats() {
    let stats: ITaskRunResult = {
      id: this.id,
      name: this.taskRef().name,
      created: this.status.created,
      start: this.status.start,
      stop: this.status.stop,
      duration: this.status.duration,
      incoming: this.status.incoming,
      outgoing: this.status.outgoing,
      result: this.status.result,
      has_error: this.status.error != null,
      error: this.status.error
    };
    return _.merge(stats, this.$wrapper.stats());
  }

}


