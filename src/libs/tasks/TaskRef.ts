import * as _ from 'lodash'
import {
  AbstractRef,
  Binding,
  IBuildOptions,
  IEntityRef,
  LookupRegistry,
  XS_TYPE_ENTITY,
  XS_TYPE_PROPERTY
} from "commons-schema-api/browser";
import {C_TASKS, XS_TYPE_BINDING_TASK_DEPENDS_ON, XS_TYPE_BINDING_TASK_GROUP} from "./Constants";
import {ClassUtils, NotSupportedError, NotYetImplementedError} from "commons-base";
import {Container} from "typedi";
import {TaskExchangeRef} from "./TaskExchangeRef";
import {ITaskRefOptions} from "./ITaskRefOptions";
import {ITaskInfo} from "./ITaskInfo";


export enum TaskRefType {
  CALLBACK, CLASS, INSTANCE, GROUP, REMOTE
}


export class TaskRef extends AbstractRef implements IEntityRef {

  _type: TaskRefType;

  nodeIds: string[] = [];

  _hasWorker: boolean = false;


  $source: any;

  permissions: string[] = null;

  description: string = null;

  $fn: Function | object = function (done: Function) {
    done();
  };


  constructor(name: string | object | Function, fn: object | Function = null, options: ITaskRefOptions = null) {
    super(XS_TYPE_ENTITY, TaskRef.getTaskName(name), TaskRef.getTaskObject(name, fn), C_TASKS);
    this.setOptions(options || {});

    if (!this.isRemote()) {
      this.$source = null;

      if (_.isString(name)) {
        if (_.isFunction(fn)) {
          this.$fn = fn ? fn : function (done: Function) {
            done();
          };
        }
        this._type = TaskRefType.CALLBACK;
      } else if (_.isFunction(name)) {
        this._type = TaskRefType.CLASS;
        let x = Reflect.construct(name, []);
        this.process(x);
        this.$fn = name;
      } else if (_.isObject(name)) {
        this._type = TaskRefType.INSTANCE;
        this.process(name);
        this.$fn = name;
      } else {
        throw new Error('taskRef wrong defined ' + name + ' ' + fn);
      }

      if (options && options.group) {
        this._type = TaskRefType.GROUP;
      }

      if (options && options['source'] != undefined) {
        this.$source = options['source'];
      }
    } else {
      this._type = TaskRefType.REMOTE;
      this.$source = <ITaskInfo>name;
      this.description = this.$source.description;
      this.permissions = this.$source.permissions;
    }
  }


  getFn() {
    if (!this.isRemote()) {
      return this.$fn;
    } else {
      return this.$source;
    }
  }


  clone(name: string) {
    let opts, tr;

    switch (this.getType()) {

      case TaskRefType.REMOTE:
        let source = _.clone(this.$source);
        source.name = name;
        return new TaskRef(source);

      case TaskRefType.GROUP:
        opts = _.clone(this.getOptions());
        let tr = new TaskRef(name, null, opts);
        this.grouping().forEach(x => {
          TaskRef.group(name, x);
        });
        return tr;

      default:
        let fn = _.clone(this.getFn());
        opts = _.clone(this.getOptions());
        tr = new TaskRef(name, fn, opts);
        this.dependencies().forEach(d => {
          tr.dependsOn(d);
        });
        return tr;

    }
  }


  hasTargetNodeId(nodeId: string) {
    return this.nodeIds.indexOf(nodeId) !== -1;
  }


  addNodeId(nodeId: string, hasWorker: boolean = false) {
    this.removeNodeId(nodeId);
    this.nodeIds.push(nodeId);
    this._hasWorker = hasWorker;
  }

  removeNodeId(nodeId: string) {
    _.remove(this.nodeIds, x => x == nodeId);
  }

  hasWorker() {
    return this._hasWorker;
  }

  hasNodeIds() {
    return this.nodeIds.length > 0;
  }

  isRemote(): boolean {
    return this.getOptions('remote');
  }

  private process(obj: any) {
    this.processGroup(obj);
    if (obj['description']) {
      this.description = obj['description'];
    }
    if (obj['permissions']) {
      this.permissions = obj['permissions'];
    }
  }

  private processGroup(obj: any) {
    if (obj['groups']) {
      for (let group of obj['groups']) {
        this.group(group);
      }
    }
  }


  getType() {
    return this._type;
  }


  canHaveProperties() {
    return this._type === TaskRefType.CLASS || this._type === TaskRefType.INSTANCE;
  }


  info(): ITaskInfo {
    return {
      name: this.name,
      description: this.description,
      permissions: this.permissions,
      groups: this.groups(),
      nodeIds: this.nodeIds,
      remote: this.isRemote()
    }
  }


  executable(incoming: { [k: string]: any } = {}): [Function | object, any] {
    switch (this.getType()) {
      case TaskRefType.CLASS:
        let instance = Container.get(this.object.getClass());
        _.assign(instance, incoming);
        return [instance['exec'].bind(instance), instance];

      case TaskRefType.INSTANCE:
        _.assign(this.$fn, incoming);
        return [this.$fn['exec'].bind(this.$fn), this.$fn];

      case TaskRefType.CALLBACK:
        _.assign(this.$fn, incoming);
        return [this.$fn, this.$fn];

      case TaskRefType.GROUP:
        _.assign(this.$fn, incoming);
        return [this.$fn, this.$fn];

      case TaskRefType.REMOTE:
        return null;
    }
  }


  static getTaskName(x: string | Function | object) {
    if (_.isString(x)) {
      return x;
    } else if (_.isFunction(x)) {
      let i = Reflect.construct(x, []);
      if (i.name) {
        return i.name;
      } else {
        return _.snakeCase(ClassUtils.getClassName(x));
      }
    } else if (_.isPlainObject(x)) {
      if (_.has(x, 'name')) {
        return _.get(x, 'name');
      }
    } else if (_.isObject(x) && x['name']) {
      return x['name'];
    }
    throw new NotSupportedError('can\'t find task name of ' + JSON.stringify(x));
  }


  static getTaskObject(name: string | Function | object, fn: Function | object): Function {
    if (_.isString(name)) {
      if (_.isNull(fn)) {
        return null;
      }
      return _.isFunction(fn) ? fn : fn.constructor;
    } else {
      return _.isFunction(name) ? name : _.isFunction(name.constructor) ? name.constructor : _.isFunction(fn) ? fn : fn.constructor;
    }
  }


  subtasks() {
    return LookupRegistry.$(C_TASKS).filter(<any>XS_TYPE_BINDING_TASK_GROUP, (b: Binding) => b.source == this.name).map((b: Binding) => b.target);
  }


  groups() {
    return LookupRegistry.$(C_TASKS).filter(<any>XS_TYPE_BINDING_TASK_GROUP, (b: Binding) => b.target == this.name).map((b: Binding) => b.source);
  }

  grouping() {
    return LookupRegistry.$(C_TASKS).filter(<any>XS_TYPE_BINDING_TASK_GROUP, (b: Binding) => b.source == this.name).map((b: Binding) => b.target);
  }

  dependencies(): string[] {
    return LookupRegistry.$(C_TASKS).filter(<any>XS_TYPE_BINDING_TASK_DEPENDS_ON, (b: Binding) => b.target == this.name).map((b: Binding) => b.source);
  }


  dependsOn(dest: string) {
    TaskRef.dependsOn(dest, this.name);
    return this;
  }


  group(name: string) {
    TaskRef.group(name, this.name);
    return this;
  }


  static dependsOn(src: string, dest: string) {
    const registry = LookupRegistry.$(C_TASKS);
    let f = registry.find(<any>XS_TYPE_BINDING_TASK_DEPENDS_ON, (a: Binding) => {
      return (a.source == src && a.target == dest)
    });

    if (!f) {
      let b = new Binding();
      b.bindingType = <any>XS_TYPE_BINDING_TASK_DEPENDS_ON;
      b.sourceType = XS_TYPE_ENTITY;
      b.source = src;
      b.targetType = XS_TYPE_ENTITY;
      b.target = dest;
      registry.add(<any>XS_TYPE_BINDING_TASK_DEPENDS_ON, b);
    }
  }


  static group(src: string, dest: string) {
    const registry = LookupRegistry.$(C_TASKS);
    let f = registry.find(<any>XS_TYPE_BINDING_TASK_GROUP, (a: Binding) => {
      return (a.source == src && a.target == dest)
    });

    if (!f) {
      let b = new Binding();
      b.bindingType = <any>XS_TYPE_BINDING_TASK_GROUP;
      b.sourceType = XS_TYPE_ENTITY;
      b.source = src;
      b.targetType = XS_TYPE_ENTITY;
      b.target = dest;
      registry.add(<any>XS_TYPE_BINDING_TASK_GROUP, b);
    }
    return this;
  }


  id(): string {
    return _.snakeCase(this.name.toLowerCase());
  }


  build<T>(instance: any, options?: IBuildOptions): T {
    throw new NotYetImplementedError();
  }


  create<T>(): T {
    throw new NotYetImplementedError();
  }


  getPropertyRef(name: string): TaskExchangeRef {
    return this.getPropertyRefs().find(x => x.name == name);
  }


  getPropertyRefs(): TaskExchangeRef[] {
    return this.getLookupRegistry().filter(XS_TYPE_PROPERTY, (e: TaskExchangeRef) => e.getSourceRef() === this.getClassRef());
  }


  getIncomings(): TaskExchangeRef[] {
    return this.getPropertyRefs().filter((x: TaskExchangeRef) => x.descriptor.type == "incoming");
  }


  getOutgoings(): TaskExchangeRef[] {
    return this.getPropertyRefs().filter((x: TaskExchangeRef) => x.descriptor.type == "outgoing");
  }


  getRuntime(): TaskExchangeRef {
    return this.getPropertyRefs().find((x: TaskExchangeRef) => x.descriptor.type == "runtime");
  }


}


