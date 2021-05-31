import {assign, clone, defaults, get, has, isArray, isBoolean, isFunction, isObject, isUndefined} from 'lodash';
import {TaskRef} from './TaskRef';
import {MetaArgs, NotYetImplementedError} from '@allgemein/base';
import {
  AbstractRef,
  ClassRef,
  IClassRef,
  IEntityRef,
  IJsonSchema,
  IPropertyRef,
  JsonSchema,
  METADATA_TYPE,
  METATYPE_ENTITY,
  METATYPE_PROPERTY
} from '@allgemein/schema-api';
import {K_CLS_TASK_DESCRIPTORS, XS_TYPE_BINDING_TASK_DEPENDS_ON, XS_TYPE_BINDING_TASK_GROUP} from './Constants';
import {TaskExchangeRef} from './TaskExchangeRef';
import {ITasksConfig} from './ITasksConfig';
import {ITaskRefOptions} from './ITaskRefOptions';
import {ITaskInfo} from './ITaskInfo';
import {ITaskPropertyRefOptions} from './ITaskPropertyRefOptions';
import {NullTaskRef} from './NullTaskRef';
import {MatchUtils} from '../utils/MatchUtils';
import {Binding} from '@allgemein/schema-api/lib/registry/Binding';
import {AbstractRegistry} from '@allgemein/schema-api/lib/registry/AbstractRegistry';
import {isEntityRef} from '@allgemein/schema-api/api/IEntityRef';
import {isClassRef} from '@allgemein/schema-api/api/IClassRef';
import {IJsonSchemaSerializeOptions} from '@allgemein/schema-api/lib/json-schema/IJsonSchemaSerializeOptions';


export class Tasks extends AbstractRegistry implements IJsonSchema {


  static NAME = Tasks.name;

  static taskId = 0;

  nodeId: string;

  config: ITasksConfig = {access: []};


  setConfig(config: ITasksConfig = {nodeId: null, access: []}) {
    this.config = config;
    this.nodeId = get(config, 'nodeId');
  }

  getNodeId() {
    return this.nodeId;
  }

  setNodeId(nodeId: string) {
    this.nodeId = nodeId;
  }


  private getEntries(withRemote: boolean = false): TaskRef[] {
    return this.filter(METATYPE_ENTITY, (x: TaskRef) => withRemote || !x.isRemote());
  }


  getTasks(names: string | string[]) {
    if (!isArray(names)) {
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


  getNames(withRemote: boolean = false): string[] {
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
      return this.find(METATYPE_ENTITY, (t: TaskRef) => t.name === name);
    }
    const task = this.addTask(name, null, {group: true, namespace: this.namespace});
    return task;
  }


  access(name: string) {
    if (has(this.config, 'access')) {
      // if access empty then
      let allow = this.config.access.length > 0 ? false : true;
      let count = 0;
      for (const a of this.config.access) {
        if (isUndefined(a.match)) {
          if (/\+|\.|\(|\\||\)|\*/.test(a.task)) {
            a.match = a.task;
          } else {
            a.match = false;
          }
        }
        if (isBoolean(a.match)) {
          if (a.task === name) {
            count++;
            allow = a.access === 'allow';
            return allow;
          }
        } else {
          if (MatchUtils.miniMatch(a.match, name)) {
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


  createTaskRef(options: ITaskRefOptions & ITaskInfo & { title?: string, taskName?: string, nodeId?: string }) {
    let ref: any = null;
    const target = options.target;
    delete options.target;
    if (!options.remote) {
      ref = new TaskRef(options.taskName, target, assign(options, {namespace: this.namespace}));
    } else {
      // TODO
      // this.addRemoteTask(options.taskName, classRef.getClass(true), options);
      ref = new TaskRef(options.taskName, null, assign(options, {remote: true, namespace: this.namespace}));
    }
    return ref;
  }


  create<T>(context: string,
            options:
              ITaskRefOptions &
              ITaskInfo &
              { title?: string, taskName?: string, nodeId?: string } | ITaskPropertyRefOptions): T {
    let ref: any = null;
    if (context === METATYPE_ENTITY) {
      ref = this.createTaskRef(options) as TaskRef;
      if (!ref.isRemote()) {
        ref = this.addTaskRef(ref, this.nodeId, get(options, 'worker', false), false);
      } else {
        ref = this.addTaskRef(ref, (<any>options).nodeId, get(options, 'worker', false), false);
      }
    } else if (context === METATYPE_PROPERTY) {
      ref = new TaskExchangeRef(<ITaskPropertyRefOptions>options);
      this.add(METATYPE_PROPERTY, ref);
    }
    return ref; // super.create(context, options);
  }


  addTask(name: string | object | Function,
          fn: object | Function = null,
          options: ITaskRefOptions = null,
          withProperties: boolean = true): TaskRef {
    // const task = new TaskRef(name, fn, defaults(options, {namespace: this.namespace}));
    let opts = {};

    if (isFunction(name) || isObject(name)) {
      opts = {
        taskName: TaskRef.getTaskName(name),
        target: name,
        namespace: this.namespace,
        ...options
      };
    } else {
      opts = {
        taskName: TaskRef.getTaskName(name),
        target: fn,
        namespace: this.namespace,
        ...options
      };
    }

    const taskRef = this.createTaskRef(opts);
    return this.addTaskRef(taskRef, this.nodeId, get(options, 'worker', false), withProperties);
  }


  addRemoteTask(nodeId: string,
                info: ITaskInfo,
                hasWorker: boolean = false,
                withProperties: boolean = true
  ): TaskRef {
    // const task = new TaskRef(info, null, {remote: true, namespace: this.namespace});
    const opts: any = {
      taskName: info.name as any,
      target: null,
      remote: true,
      namespace: this.namespace
    };

    const taskRef = this.createTaskRef(defaults(opts, info));
    return this.addTaskRef(taskRef, nodeId, hasWorker, withProperties);
  }


  addTaskRef(task: TaskRef, nodeId: string, hasWorker: boolean = false, withProperties = true) {
    if (this.access(task.name) || task.isRemote()) {
      const exists = <TaskRef>this.find(METATYPE_ENTITY, (x: TaskRef) => x.name === task.name);
      if (!exists) {
        task.addNodeId(nodeId, hasWorker);
        this.add(METATYPE_ENTITY, task);
        if (task.canHaveProperties() && withProperties) {
          const ref = task.getClassRef().getClass(false);
          if (ref) {
            const taskInstance = Reflect.construct(ref, []);
            MetaArgs.key(K_CLS_TASK_DESCRIPTORS).filter(x => x.target === ref).map((desc: ITaskPropertyRefOptions) => {
              // get default values
              if (!has(desc, 'default')) {
                if (!isUndefined(taskInstance[desc.propertyName])) {
                  desc.default = clone(taskInstance[desc.propertyName]);
                }
              }
              desc.namespace = this.namespace;
              this.create(METATYPE_PROPERTY, desc);
            });
          }
        }
        return this.get(task.name);
      } else {
        exists.addNodeId(nodeId, hasWorker);
        return exists;
      }
    }

    return null;
  }


  removeTask(task: TaskRef) {
    this.remove(METATYPE_ENTITY, (x: TaskRef) => x.name === task.name);
    this.remove(METATYPE_PROPERTY, (x: TaskExchangeRef) => x.getClassRef() === task.getClassRef());
    this.remove(<any>XS_TYPE_BINDING_TASK_GROUP, (x: Binding) => x.source === task.name || x.target === task.name);
    this.remove(<any>XS_TYPE_BINDING_TASK_DEPENDS_ON, (x: Binding) => x.source === task.name || x.target === task.name);
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
    return !!this.find(METATYPE_ENTITY, (t: TaskRef) => t.name === name);
  }

  private containsGroup(name: string) {
    return !!this.find(<any>XS_TYPE_BINDING_TASK_GROUP, (t: Binding) => t.source === name);
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
    TaskRef.group(src, dest, this.namespace);
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
    TaskRef.dependsOn(src, dest, this.namespace);
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
      if (isUndefined(fn)) {
        return this.get(name);
      }
    }
    const task = this.addTask(name, fn, options);
    if (!task) {
      return new NullTaskRef();
    }
    return task;
  }


  async toJsonSchema(options?: IJsonSchemaSerializeOptions) {
    const entities = this.getEntries(true);
    const serializer = JsonSchema.getSerializer(defaults(options || {}, {
      namespace: this.namespace,
      allowKeyOverride: true
    }));
    entities.map(x => serializer.serialize(x));
    return serializer.getJsonSchema();
  }


  // reset() {
  //   super.reset();
  // }


  fromJsonSchema(orgJson: any): Promise<TaskRef | TaskRef[]> {
    return JsonSchema.unserialize(orgJson, {namespace: this.namespace}) as Promise<TaskRef | TaskRef[]>;
  }


  register(xsdef: AbstractRef | Binding): AbstractRef | Binding {
    if (xsdef instanceof TaskRef) {
      return this.add(METATYPE_ENTITY, xsdef);
    } else if (xsdef instanceof TaskExchangeRef) {
      return this.add(METATYPE_PROPERTY, xsdef);
    } else if (xsdef instanceof Binding) {
      return this.add(xsdef.bindingType, xsdef);
    } else {
      throw new NotYetImplementedError();
    }
  }


  getPropertyRef(ref: IClassRef | IEntityRef, name: string): TaskExchangeRef {
    if (isEntityRef(ref)) {
      return this.find(METATYPE_PROPERTY, (x: IPropertyRef) => x.getClassRef() === ref.getClassRef() && x.name === name);
    }
    return this.find(METATYPE_PROPERTY, (x: IPropertyRef) => x.getClassRef() === ref && x.name === name);
  }

  getPropertyRefs(ref: IClassRef | IEntityRef): TaskExchangeRef[] {
    if (isEntityRef(ref)) {
      return this.filter(METATYPE_PROPERTY, (x: IPropertyRef) => x.getClassRef() === ref.getClassRef());
    }
    return this.filter(METATYPE_PROPERTY, (x: IPropertyRef) => x.getClassRef() === ref);
  }

  /**
   * Return a class ref for passing string, Function or class ref
   *
   * @param object
   * @param type
   */
  getClassRefFor(object: string | Function | IClassRef, type: METADATA_TYPE): IClassRef {
    if (isClassRef(object)) {
      return object;
    }
    return ClassRef.get(object as string | Function, this.namespace, type === METATYPE_PROPERTY);
  }

  // getEntityRefFor(fn: string | object | Function, skipNsCheck?: boolean): TaskRef {
  //   throw new NotYetImplementedError();
  // }
  //
  // getPropertyRefsFor(fn: any): TaskExchangeRef[] {
  //   throw new NotYetImplementedError();
  // }

  // fromJson(orgJson: IEntityRefMetadata): TaskRef {
  //   const json = cloneDeep(orgJson);
  //
  //   let entityRef: TaskRef = this.getEntries(true).find(x => x.name === json.name);
  //   if (!entityRef) {
  //     entityRef = TaskRef.fromJson(json);
  //     this.register(entityRef);
  //   }
  //
  //   if (entityRef) {
  //     for (const prop of json.properties) {
  //       const classRef = entityRef.getClassRef();
  //       let propRef: TaskExchangeRef = this.registry.find(METATYPE_PROPERTY,
  //         (x: TaskExchangeRef) => x.name === prop.name && x.getClassRef() === classRef);
  //       if (!propRef) {
  //         const desc: ITaskPropertyRefOptions = (<any>prop).descriptor;
  //         desc.target = classRef.getClass();
  //         propRef = new TaskExchangeRef(desc);
  //         this.register(propRef);
  //       }
  //     }
  //   }
  //
  //   return entityRef;
  // }

}
