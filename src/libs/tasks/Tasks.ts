import * as _ from 'lodash';
import {TaskRef, TaskRefType} from "./TaskRef";
import {TaskRunner} from "./TaskRunner";
import {ClassLoader, MetaArgs, NotYetImplementedError} from "commons-base";
import {K_CLS_TASKS, RuntimeLoader} from "../..";
import {Binding, ILookupRegistry, LookupRegistry, XS_TYPE_ENTITY, XS_TYPE_PROPERTY} from "commons-schema-api";
import {
  C_TASKS,
  K_CLS_TASK_DESCRIPTORS,
  XS_TYPE_BINDING_TASK_DEPENDS_ON,
  XS_TYPE_BINDING_TASK_GROUP
} from "./Constants";
import {Minimatch} from 'minimatch';
import {TaskExchangeRef} from "./TaskExchangeRef";
import {ITasksConfig} from "./ITasksConfig";
import {ITaskRefOptions} from "./ITaskRefOptions";
import {ITaskInfo} from "./ITaskInfo";
import {Bootstrap} from "../../Bootstrap";

export class Tasks implements ILookupRegistry {

  static NAME: string = 'Tasks';


  static taskId: number = 0;

  config: ITasksConfig = {access: []};

  registry: LookupRegistry = LookupRegistry.$(C_TASKS);

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
    if (_.isArray(name)) {
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


  private getEntries(withRemote: boolean = false) {
    return this.registry.list(XS_TYPE_ENTITY).filter(x => withRemote || !x.isRemote())
  }


  getTasks(names: string | string[]) {
    if (!_.isArray(names)) {
      names = [names];
    }
    let _names: string[] = [];
    for (let i = 0; i < names.length; i++) {
      if (!this.contains(names[i])) {
        throw new Error('task ' + names[i] + ' not exists')
      }
      _names.push(names[i]);
    }
    return this.getEntries(true).filter((x: TaskRef) => _names.indexOf(x.name) != -1)
  }


  list(withRemote: boolean = false): string[] {
    return this.names(withRemote);
  }


  names(withRemote: boolean = false): string[] {
    return this.getEntries(withRemote).map(x => x.name);
  }


  infos(withRemote: boolean = false): ITaskInfo[] {
    return this.getEntries(withRemote).map((x: TaskRef) => {
      return x.info();
    });
  }


  get(name: string): TaskRef {
    if (this.containsTask(name)) {
      return this.registry.find(XS_TYPE_ENTITY, (t: TaskRef) => t.name == name);
    }
    let task = this.addTask(name, null, {group: true});
    return task;
  }


  access(name: string) {
    if (_.has(this.config, 'access')) {
      // if access empty then
      let allow = this.config.access.length > 0 ? false : true;
      let count: number = 0;
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
      if (count == 0) {
        allow = true;
      }
      return allow;
    }
    return true;
  }


  addTask(name: string | object | Function, fn: object | Function = null, options: ITaskRefOptions = null): TaskRef {
    let task = new TaskRef(name, fn, options);
    return this.addTaskRef(task);
  }


  addRemoteTask(nodeId: string, info: ITaskInfo): TaskRef {
    let task = new TaskRef(info, null, {remote: true});
    return this.addTaskRef(task, nodeId);
  }


  addTaskRef(task: TaskRef, nodeId: string = Bootstrap.getNodeId()) {
    if (this.access(task.name)) {
      let exists = <TaskRef>this.registry.find(XS_TYPE_ENTITY, (x: TaskRef) => x.name == task.name);
      if (!exists) {
        task.addNodeId(nodeId);
        this.registry.add(XS_TYPE_ENTITY, task);
        if (task.canHaveProperties()) {
          let ref = task.getClassRef().getClass(false);
          if (ref) {
            MetaArgs.key(K_CLS_TASK_DESCRIPTORS).filter(x => x.target == ref).map(desc => {
              let prop = new TaskExchangeRef(desc);
              this.registry.add(XS_TYPE_PROPERTY, prop);
            })
          }
        }
        return this.get(task.name);
      } else {
        exists.addNodeId(nodeId);
        return exists;
      }
    }
    return null;
  }


  removeTask(task: TaskRef) {
    this.registry.remove(XS_TYPE_ENTITY, (x: TaskRef) => x.name == task.name);
    this.registry.remove(XS_TYPE_PROPERTY, (x: TaskExchangeRef) => x.getClassRef() == task.getClassRef());
    this.registry.remove(<any>XS_TYPE_BINDING_TASK_GROUP, (x: Binding) => x.source == task.name || x.target == task.name);
    this.registry.remove(<any>XS_TYPE_BINDING_TASK_DEPENDS_ON, (x: Binding) => x.source == task.name || x.target == task.name);
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
    return this.containsTask(name) || this.containsGroup(name);
  }


  private containsTask(name: string) {
    return !!this.registry.find(XS_TYPE_ENTITY, (t: TaskRef) => t.name == name);
  }

  private containsGroup(name: string) {
    return !!this.registry.find(<any>XS_TYPE_BINDING_TASK_GROUP, (t: Binding) => t.source == name);
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
    let taskRef = null;
    if (this.contains(name)) {
      taskRef = this.get(name);
      let taskRefClone = taskRef.clone(new_name);

      return this.addTaskRef(taskRefClone);
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
      this.addTask(klass);
    }
  }


  reset() {
    LookupRegistry.reset(C_TASKS);
    this.registry = LookupRegistry.$(C_TASKS);
  }

  fromJson(json: any): TaskRef {
    throw new NotYetImplementedError();
    //return undefined;
  }

  getEntityRefFor(fn: any): TaskRef {
    throw new NotYetImplementedError();
  }

  getPropertyRefsFor(fn: any): TaskExchangeRef[] {
    throw new NotYetImplementedError();
  }

}
