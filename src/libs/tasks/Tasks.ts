import * as _ from 'lodash';
import {TaskRef} from "./TaskRef";
import {TaskRunner} from "./TaskRunner";
import {ClassLoader, MetaArgs} from "commons-base";
import {Container} from "typedi";
import {K_CLS_TASKS, RuntimeLoader} from "../..";
import {LookupRegistry, XS_TYPE_ENTITY, XS_TYPE_PROPERTY} from "commons-schema-api";
import {K_CLS_TASK_DESCRIPTORS} from "./Constants";
import {Minimatch} from 'minimatch';
import {TaskExchangeRef} from "./TaskExchangeRef";
import {Config} from "commons-config";
import {ITasksConfig} from "./ITasksConfig";


export class Tasks {

  static NAME: string = 'Tasks';

  static _self: Tasks = null;

  static taskId: number = 0;

  /*
  static CONST = {
    GROUP: 1,
    DEPENDS_ON: 2,
    EVENTS: {
      NEXT: TASKRUN_STATE_NEXT,
      TASK_RUN: TASKRUN_STATE_RUN,
      TASK_DONE: TASKRUN_STATE_DONE,
      FINISHED: TASKRUN_STATE_FINISHED
    }
  };
*/

  config: ITasksConfig = {access: []};

  registry: LookupRegistry = LookupRegistry.$('tasks');

//  $tasks: { [key: string]: TaskRef } = {};

  //$bindings: any[] = [];

  constructor() {}


  static _(): Tasks {
    if (!Tasks._self) {
      Tasks._self = new Tasks()
    }
    return Tasks._self;
  }


  setConfig(config: ITasksConfig = {access: []}) {
    this.config = config;
  }


  prepare(loader: RuntimeLoader) {
    let klasses = loader.getClasses(K_CLS_TASKS);
    for (let klass of klasses) {
      let task = Reflect.construct(klass, []);
      if (!('name' in task) || !_.isFunction(task['exec'])) throw new Error('task ' + klass + ' has no name');
      this.addTask(klass);
    }
  }


  runner(name: string | string[], options: any) {
    if (Array.isArray(name)) {
      let names = [];
      for (let i = 0; i < name.length; i++) {
        if (!this.contains(name[i])) {
          throw new Error('task ' + name[i] + ' not exists')
        }
        names.push(name[i]);
      }
      return new TaskRunner(this, names, options);
    } else {
      if (this.contains(name)) {
        return new TaskRunner(this, [name], options);
      }
    }
    throw new Error('task ' + name + ' not exists')
  }


  list() {
    return this.registry.list(XS_TYPE_ENTITY).map(x => x.name);
  }


  get(name: string): TaskRef {
    if (this.contains(name)) {
      return this.registry.find(XS_TYPE_ENTITY, (t: TaskRef) => t.name == name);
    }
    let task = this.addTask(name);
    return task;
  }

  access(name: string) {
    if (_.has(this.config, 'access')) {
      // if access empty then
      let allow = this.config.access.length > 0 ? false : true;
      let count:number = 0;
      for (let a of this.config.access) {
        if (_.isUndefined(a.match)) {
          if (/\+|\.|\(|\\||\)|\*/.test(a.task)) {
            a.match = new Minimatch(a.task);
          } else {
            a.match = false;
          }
        }
        if (_.isBoolean(a.match)) {
          if (a.task === name) {
            count++;
            allow = a.access == 'allow';
            return allow;
          }
        } else {
          if (a.match.match(name)) {
            allow = allow || a.access == 'allow';
            count++;
          }
        }
      }
      // no allowed or denied
      if(count == 0){
        allow = true;
      }
      return allow;

    }
    return true;
  }

  addTask(name: string | Function, fn: Function = null, options: any = null): TaskRef {
    let task = new TaskRef(name, fn, options);
    if (this.access(task.name)) {

      this.registry.add(XS_TYPE_ENTITY, task);
      let ref = task.getClassRef().getClass(false);
      if (ref) {
        MetaArgs.key(K_CLS_TASK_DESCRIPTORS).filter(x => x.target == ref).map(desc => {
          let prop = new TaskExchangeRef(desc);
          this.registry.add(XS_TYPE_PROPERTY, prop);
        })
      }
      return this.get(task.name);
    }
    return null;


  }

  /**
   *
   * @param name
   * @param fn
   * @param options
   * @deprecated
   */
  new(name: string | Function, fn: Function = null, options: any = null): TaskRef {
    return this.addTask(name, fn, options);
  }


  contains(name: string) {
    return !!this.registry.find(XS_TYPE_ENTITY, (t: TaskRef) => t.name == name);
  }

  /**
   * Fires src as subtask of dest
   *
   * src attachTo dest
   *
   * @param src
   * @param dest
   */
  group(src: string, dest: string) {
    TaskRef.group(src, dest);
    return this;
  }

  /**
   * Fires src after execution of dest
   *
   * src dependsOn dest
   *
   * @param src
   * @param dest
   */
  dependsOn(src: string, dest: string) {
    TaskRef.dependsOn(src, dest);
    return this;
  }


  taskGroup(name: string) {
    if (this.contains(name)) {
      return this.get(name);
    }
    let task = this.addTask(name, function (done: Function) {
      done()
    });
    return task;
  }


  taskMap(new_name: string, name: string) {
    let task = null;
    if (this.contains(name)) {
      task = this.get(name);
      let fn = task.$fn;
      return this.addTask(new_name, fn, _.clone(task.getOptions()));
    } else {
      throw new Error('task doesn\'t exists')
    }

  }

  task(name: string, fn: Function, options: any) {
    if (this.contains(name)) {
      if (_.isUndefined(fn)) {
        return this.get(name);
      }
    }
    let task = this.addTask(name, fn, options);
    return task;
  }


  async addClasses(dir: string) {
    let klazzes = await ClassLoader.importClassesFromDirectoriesAsync([dir]);
    for (let klass of klazzes) {
      let task = Reflect.construct(klass, []);
      if (!('name' in task) || !_.isFunction(task['exec'])) throw new Error('task ' + klass + ' has no name');
      this.new(klass);
    }
  }


}
