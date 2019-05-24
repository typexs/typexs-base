import * as _ from 'lodash';
import {TaskRef} from './TaskRef';
import {MetaArgs, NotYetImplementedError} from 'commons-base/browser';
import {
  AbstractRef,
  Binding,
  IEntityRefMetadata,
  ILookupRegistry,
  LookupRegistry,
  XS_TYPE_ENTITY,
  XS_TYPE_PROPERTY
} from 'commons-schema-api/browser';
import {
  C_TASKS,
  K_CLS_TASK_DESCRIPTORS,
  XS_TYPE_BINDING_TASK_DEPENDS_ON,
  XS_TYPE_BINDING_TASK_GROUP
} from './Constants';
import {isMatch} from 'micromatch';
import {TaskExchangeRef} from './TaskExchangeRef';
import {ITasksConfig} from './ITasksConfig';
import {ITaskRefOptions} from './ITaskRefOptions';
import {ITaskInfo} from './ITaskInfo';
import {ITaskDesc} from '../..';
import {NullTaskRef} from './NullTaskRef';


export class Tasks implements ILookupRegistry {


  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  static NAME = 'Tasks';

  static taskId = 0;

  readonly nodeId: string;

  config: ITasksConfig = {access: []};

  registry: LookupRegistry = LookupRegistry.$(C_TASKS);

  setConfig(config: ITasksConfig = {access: []}) {
    this.config = config;
  }


  private getEntries(withRemote: boolean = false) {
    return this.registry.list(XS_TYPE_ENTITY).filter(x => withRemote || !x.isRemote());
  }


  getTasks(names: string | string[]) {
    if (!_.isArray(names)) {
      names = [names];
    }
    const _names: string[] = [];
    for (let i = 0; i < names.length; i++) {
      if (!this.contains(names[i])) {
        throw new Error('task ' + names[i] + ' not exists');
      }
      _names.push(names[i]);
    }
    return this.getEntries(true).filter((x: TaskRef) => _names.indexOf(x.name) !== -1);
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
      return this.registry.find(XS_TYPE_ENTITY, (t: TaskRef) => t.name === name);
    }
    const task = this.addTask(name, null, {group: true});
    return task;
  }


  access(name: string) {
    if (_.has(this.config, 'access')) {
      // if access empty then
      let allow = this.config.access.length > 0 ? false : true;
      let count = 0;
      for (const a of this.config.access) {
        if (_.isUndefined(a.match)) {
          if (/\+|\.|\(|\\||\)|\*/.test(a.task)) {
            a.match = a.task;
          } else {
            a.match = false;
          }
        }
        if (_.isBoolean(a.match)) {
          if (a.task === name) {
            count++;
            allow = a.access === 'allow';
            return allow;
          }
        } else {
          if (isMatch(name, a.match)) {
            allow = allow || a.access === 'allow';
            count++;
          }
        }
      }
      // no allowed or denied
      if (count === 0) {
        allow = true;
      }
      return allow;
    }
    return true;
  }


  addTask(name: string | object | Function, fn: object | Function = null, options: ITaskRefOptions = null): TaskRef {
    const task = new TaskRef(name, fn, options);
    return this.addTaskRef(task, this.nodeId);
  }


  addRemoteTask(nodeId: string, info: ITaskInfo): TaskRef {
    const task = new TaskRef(info, null, {remote: true});
    return this.addTaskRef(task, nodeId);
  }


  addTaskRef(task: TaskRef, nodeId: string) {
    if (this.access(task.name)) {
      const exists = <TaskRef>this.registry.find(XS_TYPE_ENTITY, (x: TaskRef) => x.name === task.name);
      if (!exists) {
        task.addNodeId(nodeId);
        this.registry.add(XS_TYPE_ENTITY, task);
        if (task.canHaveProperties()) {
          const ref = task.getClassRef().getClass(false);
          if (ref) {
            MetaArgs.key(K_CLS_TASK_DESCRIPTORS).filter(x => x.target === ref).map(desc => {
              const prop = new TaskExchangeRef(desc);
              this.registry.add(XS_TYPE_PROPERTY, prop);
            });
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
    this.registry.remove(XS_TYPE_ENTITY, (x: TaskRef) => x.name === task.name);
    this.registry.remove(XS_TYPE_PROPERTY, (x: TaskExchangeRef) => x.getClassRef() === task.getClassRef());
    this.registry.remove(<any>XS_TYPE_BINDING_TASK_GROUP, (x: Binding) => x.source === task.name || x.target === task.name);
    this.registry.remove(<any>XS_TYPE_BINDING_TASK_DEPENDS_ON, (x: Binding) => x.source === task.name || x.target === task.name);
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
    return !!this.registry.find(XS_TYPE_ENTITY, (t: TaskRef) => t.name === name);
  }

  private containsGroup(name: string) {
    return !!this.registry.find(<any>XS_TYPE_BINDING_TASK_GROUP, (t: Binding) => t.source === name);
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
    const task = this.addTask(name, function (done: Function) {
      done();
    });

    if (!task) {
      return new NullTaskRef();
    }
    return task;
  }


  taskMap(new_name: string, name: string) {
    let taskRef = null;
    if (this.contains(name)) {
      taskRef = this.get(name);
      const taskRefClone = taskRef.clone(new_name);
      return this.addTaskRef(taskRefClone, this.nodeId);
    } else {
      throw new Error('task doesn\'t exists');
    }
  }


  task(name: string, fn: Function, options: any) {
    if (this.contains(name)) {
      if (_.isUndefined(fn)) {
        return this.get(name);
      }
    }
    const task = this.addTask(name, fn, options);
    if (!task) {
      return new NullTaskRef();
    }
    return task;
  }


  toJson() {
    return this.getEntries(true).map((x: TaskRef) => x.toJson());
  }


  reset() {
    LookupRegistry.reset(C_TASKS);
    this.registry = LookupRegistry.$(C_TASKS);
  }


  fromJson(orgJson: IEntityRefMetadata): TaskRef {
    const json = _.cloneDeep(orgJson);

    let entityRef: TaskRef = this.getEntries(true).find(x => x.name === json.name);
    if (!entityRef) {
      entityRef = TaskRef.fromJson(json);
      this.register(entityRef);
    }

    if (entityRef) {
      for (const prop of json.properties) {
        const classRef = entityRef.getClassRef();
        let propRef: TaskExchangeRef = this.registry.find(XS_TYPE_PROPERTY,
          (x: TaskExchangeRef) => x.name === prop.name && x.getClassRef() === classRef);
        if (!propRef) {
          const desc: ITaskDesc = (<any>prop).descriptor;
          desc.target = classRef.getClass();
          propRef = new TaskExchangeRef(desc);
          this.register(propRef);
        }
      }
    }

    return entityRef;
  }


  register(xsdef: AbstractRef | Binding): AbstractRef | Binding {
    if (xsdef instanceof TaskRef) {
      return this.registry.add(XS_TYPE_ENTITY, xsdef);
    } else if (xsdef instanceof TaskExchangeRef) {
      return this.registry.add(XS_TYPE_PROPERTY, xsdef);
    } else if (xsdef instanceof Binding) {
      return this.registry.add(xsdef.bindingType, xsdef);
    } else {
      throw new NotYetImplementedError();
    }
  }


  getEntityRefFor(fn: any): TaskRef {
    throw new NotYetImplementedError();
  }

  getPropertyRefsFor(fn: any): TaskExchangeRef[] {
    throw new NotYetImplementedError();
  }

}
