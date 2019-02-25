import * as _ from 'lodash'
import {
  AbstractRef,
  Binding,
  IBuildOptions,
  IEntityRef,
  IPropertyRef,
  LookupRegistry,
  XS_TYPE_ENTITY, XS_TYPE_PROPERTY
} from "commons-schema-api/browser";
import {C_TASKS, XS_TYPE_BINDING_TASK_DEPENDS_ON, XS_TYPE_BINDING_TASK_GROUP} from "./Constants";
import {ClassUtils, NotSupportedError, NotYetImplementedError} from "commons-base";
import {Container} from "typedi";
import {TaskRuntimeContainer} from "./TaskRuntimeContainer";
import {TypeOrmPropertyRef} from "../..";
import {TaskExchangeRef} from "./TaskExchangeRef";


export enum TaskRefType {
  CALLBACK, CLASS, INSTANCE
}


export class TaskRef extends AbstractRef implements IEntityRef {

  _type: TaskRefType;

  //$name: any;

  $source: any;

  $fn: Function;


  constructor(name: any, fn: Function = null, options: any = null) {
    super(XS_TYPE_ENTITY, TaskRef.getTaskName(name), _.isFunction(name) ? name : _.isFunction(name.constructor) ? name.constructor : fn, C_TASKS);
    this.setOptions(options || {});

    this.$source = null;

    if (_.isString(name)) {
      //this.$name = name;
      this.$fn = fn;
      this._type = TaskRefType.CALLBACK;
    } else if (_.isFunction(name)) {
      this._type = TaskRefType.CLASS;
      let x = Reflect.construct(name, []);
      if (x['groups']) {

        for (let group of x['groups']) {
          this.group(group);
        }
      }


    } else if (_.isObject(name)) {
      this._type = TaskRefType.INSTANCE;
      //this.$name = name['name'];

      // this.$groups = name['groups'] || [];
      if (name['groups']) {
        for (let group of name['groups']) {
          this.group(group);
        }
      }
      this.$fn = name;
      //this.$source = name;
    } else {
      throw new Error('taskRef wrong defined ' + name + ' ' + fn);
    }

    if (options && options['source'] != undefined) {
      this.$source = options['source'];
    }
  }


  getType() {
    return this._type;
  }


  executable(incoming: { [k: string]: any } = {}): [Function, any] {
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
    }
    throw new NotSupportedError('')
  }


  subtasks() {
    return LookupRegistry.$(C_TASKS).filter(<any>XS_TYPE_BINDING_TASK_GROUP, (b: Binding) => b.target == this.name).map((b: Binding) => b.source);
  }

  dependencies(): string[] {
    return LookupRegistry.$(C_TASKS).filter(<any>XS_TYPE_BINDING_TASK_DEPENDS_ON, (b: Binding) => b.target == this.name).map((b: Binding) => b.source);
    /*
        for (let i = 0; i < this.$registry.$bindings.length; i++) {
          let obj = this.$registry.$bindings[i];
          if (obj.type == Tasks.CONST.DEPENDS_ON && obj.dest == this.$name) {
            tasks.push(obj.src);
          }
        }
        */
    //return tasks;
  }


  dependsOn(dest: string) {
    TaskRef.dependsOn(this.name, dest);
    return this;
  }


  group(name: string) {
    TaskRef.group(this.name, name);
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
      b.target = src;
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
      b.target = src;
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
    return this.getLookupRegistry().filter(XS_TYPE_PROPERTY, (e: TaskExchangeRef) => e.getSourceRef().getClass() === this.getClass());
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


