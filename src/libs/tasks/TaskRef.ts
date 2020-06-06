import * as _ from 'lodash';
import {
  AbstractRef,
  Binding,
  ClassRef,
  IBuildOptions,
  IEntityRef,
  IEntityRefMetadata,
  LookupRegistry,
  XS_TYPE_ENTITY,
  XS_TYPE_PROPERTY
} from 'commons-schema-api/browser';
import {C_TASKS, XS_TYPE_BINDING_TASK_DEPENDS_ON, XS_TYPE_BINDING_TASK_GROUP} from './Constants';
import {ClassUtils, NotSupportedError, NotYetImplementedError} from 'commons-base/browser';
import {TaskExchangeRef} from './TaskExchangeRef';
import {ITaskRefOptions} from './ITaskRefOptions';
import {ITaskInfo} from './ITaskInfo';
import {Injector} from '../di/Injector';
import {ITaskRefNodeInfo} from './ITaskRefNodeInfo';


export enum TaskRefType {
  CALLBACK, CLASS, INSTANCE, GROUP, REMOTE
}


/**
 * Descriptor for task functionality and location
 */
export class TaskRef extends AbstractRef implements IEntityRef {


  _type: TaskRefType;

  nodeInfos: ITaskRefNodeInfo[] = [];

  $source: any;

  permissions: string[] = null;

  description: string = null;


  constructor(name: string | object | Function, fn: object | Function = null, options: ITaskRefOptions = null) {
    super(XS_TYPE_ENTITY, TaskRef.getTaskName(name), TaskRef.getTaskObject(name, fn), C_TASKS);
    this.setOptions(options || {});
    this.prepare(name, fn);
  }


  static fromJson(json: IEntityRefMetadata & any): TaskRef {
    let target = null;
    if (json.target) {
      target = ClassRef.get(json.target.className, C_TASKS).getClass(true);
    }
    const taskRef = new TaskRef(json.name, target);
    taskRef._type = <any>TaskRefType[json.mode];
    taskRef.description = json.description;
    taskRef.permissions = json.permissions;
    taskRef.nodeInfos = _.get(json, 'nodeInfos', []);
    const groups = _.get(json, 'groups', []);
    taskRef.setOptions(json.options);
    groups.forEach((group: string) => {
      taskRef.group(group);
    });
    return taskRef;
  }


  static getTaskName(x: string | Function | object) {
    if (_.isString(x)) {
      return x;
    } else if (_.isFunction(x)) {
      const i = Reflect.construct(x, []);
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


  static dependsOn(src: string, dest: string) {
    const registry = LookupRegistry.$(C_TASKS);
    const f = registry.find(<any>XS_TYPE_BINDING_TASK_DEPENDS_ON, (a: Binding) => {
      return (a.source === src && a.target === dest);
    });

    if (!f) {
      const b = new Binding();
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
    const f = registry.find(<any>XS_TYPE_BINDING_TASK_GROUP, (a: Binding) => {
      return (a.source === src && a.target === dest);
    });

    if (!f) {
      const b = new Binding();
      b.bindingType = <any>XS_TYPE_BINDING_TASK_GROUP;
      b.sourceType = XS_TYPE_ENTITY;
      b.source = src;
      b.targetType = XS_TYPE_ENTITY;
      b.target = dest;
      registry.add(<any>XS_TYPE_BINDING_TASK_GROUP, b);
    }
    return this;
  }

  $fn: Function | object = function (done: Function) {
    done();
  };

  prepare(name: string | object | Function, fn: object | Function = null) {
    const options = this.getOptions();

    if (!this.isRemote()) {
      this.$source = null;

      if (_.isString(name)) {
        this._type = TaskRefType.CALLBACK;

        if (_.isFunction(fn)) {

          if (!_.isEmpty(fn.name)) {
            this._type = TaskRefType.CLASS;
            const x = Reflect.construct(fn, []);
            this.process(x);
            this.$fn = fn;
          } else {
            this.$fn = fn ? fn : function (done: Function) {
              done();
            };
          }

        } else if (_.isObject(fn)) {
          this._type = TaskRefType.INSTANCE;
          this.process(fn);
          this.$fn = fn;
        }

      } else if (_.isFunction(name)) {
        this._type = TaskRefType.CLASS;
        const x = Reflect.construct(name, []);
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

      if (options && _.isUndefined(options['source'])) {
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
    let opts: any;
    let tr: any;
    let fn: any;

    switch (this.getType()) {

      case TaskRefType.REMOTE:
        const source = _.clone(this.$source);
        source.name = name;

        tr = new TaskRef(source);
        tr.nodeInfos = _.clone(this.nodeInfos);
        return tr;

      case TaskRefType.GROUP:
        opts = _.clone(this.getOptions());
        tr = new TaskRef(name, null, opts);
        this.grouping().forEach(x => {
          TaskRef.group(name, x);
        });
        tr.nodeInfos = _.clone(this.nodeInfos);
        return tr;

      default:
        fn = this.getFn();
        opts = _.clone(this.getOptions());
        tr = new TaskRef(name, fn, opts);
        tr.nodeInfos = _.clone(this.nodeInfos);
        this.dependencies().forEach(d => {
          tr.dependsOn(d);
        });
        return tr;
    }
  }


  hasTargetNodeId(nodeId: string, withWorker: boolean = false) {
    if (withWorker) {
      return !!this.nodeInfos.find(x => x.nodeId === nodeId && x.hasWorker === withWorker);
    }
    return !!this.nodeInfos.find(x => x.nodeId === nodeId);
  }


  addNodeId(nodeId: string, hasWorker: boolean = false) {
    this.removeNodeId(nodeId);
    this.nodeInfos.push({nodeId: nodeId, hasWorker: hasWorker});
  }

  removeNodeId(nodeId: string) {
    _.remove(this.nodeInfos, x => x.nodeId === nodeId);
  }

  hasWorker() {
    return !!this.nodeInfos.find(x => x.hasWorker === true);
  }

  hasNodeIds() {
    return this.nodeInfos.length > 0;
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
      for (const group of obj['groups']) {
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
      nodeInfos: this.nodeInfos,
      remote: this.isRemote()
    };
  }

  toJson(withProperties: boolean = true): IEntityRefMetadata {
    const data = super.toJson();
    data.mode = this._type.toString();
    data.permissions = this.permissions;
    data.description = this.description;
    data.remote = this.isRemote();
    data.groups = this.groups();
    data.nodeInfos = this.nodeInfos;
    const ref = this.getClassRef();
    data.target = ref ? ref.toJson(false) : null;
    data.options = _.merge(data.options);
    if (withProperties) {
      data.properties = this.getPropertyRefs().map(p => p.toJson());
    }
    return data;
  }


  executable(incoming: { [k: string]: any } = {}): [Function | object, any] {
    switch (this.getType()) {
      case TaskRefType.CLASS:
        const instance = this.create();
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


  subtasks() {
    return LookupRegistry.$(C_TASKS).filter(<any>XS_TYPE_BINDING_TASK_GROUP,
      (b: Binding) => b.source === this.name).map((b: Binding) => b.target);
  }


  groups() {
    return LookupRegistry.$(C_TASKS).filter(<any>XS_TYPE_BINDING_TASK_GROUP,
      (b: Binding) => b.target === this.name).map((b: Binding) => b.source);
  }

  grouping() {
    return LookupRegistry.$(C_TASKS).filter(<any>XS_TYPE_BINDING_TASK_GROUP,
      (b: Binding) => b.source === this.name).map((b: Binding) => b.target);
  }

  dependencies(): string[] {
    return LookupRegistry.$(C_TASKS).filter(<any>XS_TYPE_BINDING_TASK_DEPENDS_ON,
      (b: Binding) => b.target === this.name).map((b: Binding) => b.source);
  }


  dependsOn(dest: string) {
    TaskRef.dependsOn(dest, this.name);
    return this;
  }


  group(name: string) {
    TaskRef.group(name, this.name);
    return this;
  }


  id(): string {
    return _.snakeCase(this.name.toLowerCase());
  }


  build<T>(instance: any, options?: IBuildOptions): T {
    throw new NotYetImplementedError();
  }


  create<T>(): T {
    return Injector.create(this.object.getClass());
  }


  getPropertyRef(name: string): TaskExchangeRef {
    return this.getPropertyRefs().find(x => x.name === name);
  }


  getPropertyRefs(): TaskExchangeRef[] {
    return this.getLookupRegistry().filter(XS_TYPE_PROPERTY, (e: TaskExchangeRef) => e.getSourceRef() === this.getClassRef());
  }


  getIncomings(): TaskExchangeRef[] {
    return this.getPropertyRefs().filter((x: TaskExchangeRef) => x.descriptor.type === 'incoming');
  }


  getOutgoings(): TaskExchangeRef[] {
    return this.getPropertyRefs().filter((x: TaskExchangeRef) => x.descriptor.type === 'outgoing');
  }


  getRuntime(): TaskExchangeRef {
    return this.getPropertyRefs().find((x: TaskExchangeRef) => x.descriptor.type === 'runtime');
  }


}


