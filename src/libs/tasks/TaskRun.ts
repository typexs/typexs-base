import * as _ from "lodash";
import {TaskRef} from "./TaskRef";
import {TaskRuntimeContainer} from "./TaskRuntimeContainer";
import {TaskRunner} from "./TaskRunner";
import {Log} from "../logging/Log";
import {TaskExchangeRef} from "./TaskExchangeRef";

export class TaskRun {

  static taskId: number = 0;

  id: number;

  $root: any;

  $runner: any;

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

  $taskRef: TaskRef;

  $wrapper: TaskRuntimeContainer;

  $created: Date;

  $start: Date;

  $stop: Date;

  $duration: number;


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
  }


  taskRef() {
    return this.$taskRef
  }


  ready() {
    if (!this.$done && !this.$running) {
      // console.log(this.$taskRef.$name)
      if (this.$runner.areTasksDone(this.$subtasks) && this.$runner.areTasksDone(this.$dependencies)) {
        return true;
      }
    }
    return false;
  }


  async start(done: (err: Error, res: any) => void, incoming: { [k: string]: any }) {

    this.$running = true;
    this.$start = new Date();
    this.$wrapper = new TaskRuntimeContainer(this);


    if (this.$runner.$dry_mode) {
      Log.info('dry start: ' + this.taskRef().name);
      let func = function (d: Function) {
        d();
      };
      func.call(this.$wrapper, done);
    } else {
      Log.info('taskRef start: ' + this.taskRef().name);
      let outgoings: TaskExchangeRef[] = this.taskRef().getOutgoings();

      let _incoming:any = {};
      this.taskRef().getIncomings().forEach((x: TaskExchangeRef) => {
        _incoming[x.name] = _.get(incoming, x.name, undefined);
      });
      this.$incoming = _.clone(_incoming);

      //let _incoming = this.$incoming;
      let runtimeReference = this.taskRef().getRuntime();
      if (runtimeReference) {
        _incoming[runtimeReference.name] = this.$wrapper;
      }

      const [fn, instance] = this.$taskRef.executable(_incoming);
      if (fn.length == 0) {
        try {
          let res = await fn.call(this.$wrapper);
          outgoings.forEach(x => {
            this.$outgoing[x.name] = instance[x.name];
          });
          done(null, res);
        } catch (e) {
          done(e, null);
        }
      } else {
        fn.call(this.$wrapper, (err: Error, res: any) => {
          outgoings.forEach(x => {
            this.$outgoing[x.name] = instance[x.name];
          });
          done(err, res);
        });
      }
    }
  }


  stop() {
    Log.info('stop: ' + this.taskRef().name, this.$result);
    this.$done = true;
    this.$running = false;
    this.$stop = new Date();
    this.$duration = this.$stop.getTime() - this.$start.getTime();
  }


  stats() {
    let stats = {
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

    return _.merge(stats, this.$wrapper.stats);

  }

}


