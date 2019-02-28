import * as _ from "lodash";
import {TaskRef} from "./TaskRef";
import {TaskRuntimeContainer} from "./TaskRuntimeContainer";
import {TaskRunner} from "./TaskRunner";
import {Log} from "../logging/Log";
import {TaskExchangeRef} from "./TaskExchangeRef";
import {NotSupportedError} from "commons-base";
import {ITaskRunResult} from "./ITaskRunResult";

export class TaskRun {

  static taskId: number = 0;


  id: number;

  $root: any;

  private $runner: TaskRunner;

  $initialized: any;

  $enabled: boolean;

  $done: boolean;

  $incoming: any = {};

  $outgoing: any = {};

  $running: boolean;

  $error: Error;

  $result: any;

  $dependencies: string[];

  $subtasks: any;

  private $taskRef: TaskRef;

  private $wrapper: TaskRuntimeContainer;

  $created: Date;

  $start: Date;

  $stop: Date;

  $duration: number;

  $weight: number = 0;


  constructor(runner: TaskRunner, taskRef: TaskRef) {
    this.id = TaskRun.taskId++;
    this.$root = false;
    this.$runner = runner;
    this.$initialized = false;
    this.$enabled = false;
    this.$done = false;
    this.$running = false;
    this.$error = null;

    this.$dependencies = taskRef.dependencies();

    // taskRef that should run before this taskRef! (passing values!!!)
    this.$subtasks = taskRef.subtasks();
    this.$taskRef = taskRef;
    this.$created = new Date();
    this.$start = null;
    this.$stop = null;
    this.$duration = null;
    this.$wrapper = new TaskRuntimeContainer(this);
  }


  taskRef() {
    return this.$taskRef
  }


  getRunner(){
    return this.$runner;
  }

  ready() {
    if (!this.$done && !this.$running) {
      if (this.$runner.areTasksDone(this.$subtasks) && this.$runner.areTasksDone(this.$dependencies)) {
        return true;
      }
    }
    return false;
  }


  async start(done: (err: Error, res: any) => void, incoming: { [k: string]: any }) {

    this.$running = true;
    this.$start = new Date();


    if (this.$runner.$dry_mode) {
      Log.debug('dry taskRef start: ' + this.taskRef().name);
      let func = function (d: Function) {
        d();
      };
      func.call(this.$wrapper, done);
    } else {
      Log.debug('taskRef start: ' + this.taskRef().name);
      let outgoings: TaskExchangeRef[] = this.taskRef().getOutgoings();

      this.$incoming = _.clone(incoming);

      //let _incoming = this.$incoming;
      let runtimeReference = this.taskRef().getRuntime();
      if (runtimeReference) {
        incoming[runtimeReference.name] = this.$wrapper;
      }

      const [fn, instance] = this.taskRef().executable(incoming);
      if(_.isFunction(fn)){
        if (fn.length == 0) {
          try {
            let res = await fn.call(this.$wrapper);
            outgoings.forEach(x => {
              this.$outgoing[x.storingName] = instance[x.name];
            });
            done(null, res);
          } catch (e) {
            done(e, null);
          }
        } else {
          fn.call(this.$wrapper, (err: Error, res: any) => {
            outgoings.forEach(x => {
              this.$outgoing[x.storingName] = instance[x.name];
            });
            done(err, res);
          });
        }
      }else{
        throw new NotSupportedError('no executable for '+this.taskRef().name)
      }
    }
  }


  stop() {
    Log.debug('stop: ' + this.taskRef().name);
    this.$done = true;
    this.$running = false;
    this.$stop = new Date();
    this.$duration = this.$stop.getTime() - this.$start.getTime();
    this.$wrapper.done();
  }


  update(){
    this.getRunner().update(this.taskRef().name);
  }


  stats() {
    let stats:ITaskRunResult = {
      id: this.id,
      name: this.taskRef().name,
      created: this.$created,
      start: this.$start,
      stop: this.$stop,
      duration: this.$duration,
      incoming: this.$incoming,
      outgoing: this.$outgoing,
      result: this.$result,
      has_error: this.$error != null,
      error: this.$error
    };
    return _.merge(stats, this.$wrapper.stats());
  }

}


