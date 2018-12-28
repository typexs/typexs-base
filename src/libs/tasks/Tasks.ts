import * as _ from 'lodash';
import {Task} from "./Task";
import {TaskRunner} from "./TaskRunner";
import {ClassLoader} from "commons-base";
import {Container} from "typedi";
import {K_CLS_TASKS, RuntimeLoader} from "../..";


export class Tasks {

  static NAME: string = 'Tasks';

  static _self: Tasks = null;

  static taskId: number = 0;

  static CONST = {
    GROUP: 1,
    DEPENDS_ON: 2,
    EVENTS: {
      NEXT: 'next',
      TASK_RUN: 'taskRun',
      TASK_DONE: 'taskDone',
      FINISHED: 'finished'
    }
  };

  $tasks: { [key: string]: Task } = {};
  $bindings: any[] = [];

  constructor() {
    this.$tasks = {};
    this.$bindings = [];
    Tasks._self = this;
  }

  static _(): Tasks {
    if (!Tasks._self) {
      Tasks._self = new Tasks()
    }
    return Tasks._self;
  }


  prepare(loader: RuntimeLoader) {
    let klasses = loader.getClasses(K_CLS_TASKS);
    for (let klass of klasses) {
      let task = <Function>Container.get(klass);
      if (!('name' in task) || !_.isFunction(task['exec'])) throw new Error('task ' + klass + ' has no name');
      this.new(task);
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
    return Object.keys(this.$tasks)
  }


  get(name: string): Task {
    if (this.contains(name)) {
      return this.$tasks[name]
    }
    let task = this.new(name);
    return task;
  }


  new(name: string | Function, fn: Function = null, options: any = null): Task {
    let task = new Task(this, name, fn, options);
    this.$tasks[task.name()] = task;
    /*
    if (fn) {
      this.$tasks[name].init();
    }
    */

    return this.get(task.name());
  }


  contains(name: string) {
    return this.$tasks[name] != undefined
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

    let f = _.find(this.$bindings, function (a) {
      return a.type == Tasks.CONST.GROUP && ((a.src == src && a.dest == dest))
    });

    if (!f) {
      this.$bindings.push({
        type: Tasks.CONST.GROUP, // fixme change to grouping!
        src: src, dest: dest
      })
    }
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

    let f = _.find(this.$bindings, function (a) {
      return a.type == Tasks.CONST.DEPENDS_ON && (a.src == src && a.dest == dest)
    });
    if (!f) {
      this.$bindings.push({
        type: Tasks.CONST.DEPENDS_ON,
        src: dest,
        dest: src
      })
    }
    return this;
  }


  taskGroup(name: string) {
    if (this.contains(name)) {
      return this.get(name);
    }
    let task = this.new(name, function (done: Function) {
      done()
    });
    return task;
  }


  taskMap(new_name: string, name: string) {

    let task = null;
    if (this.contains(name)) {
      task = this.get(name);
      let fn = task.$fn;
      return this.new(new_name, fn, _.clone(task.$options));
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
    let task = this.new(name, fn, options);
    return task;
  }


  addClasses(dir: string) {
    let klazzes = ClassLoader.importClassesFromDirectories([dir]);
    for (let klass of klazzes) {
      let task = <Function>Container.get(klass);
      if (!('name' in task) || !_.isFunction(task['exec'])) throw new Error('task ' + klass + ' has no name');
      this.new(task);
    }
  }


}
