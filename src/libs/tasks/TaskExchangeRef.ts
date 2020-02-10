import {AbstractRef, IClassRef, IPropertyRef, XS_TYPE_PROPERTY} from 'commons-schema-api/browser';
import {TaskRef} from './TaskRef';
import {C_TASKS} from './Constants';
import {ClassUtils, NotYetImplementedError, TreeUtils, WalkValues} from 'commons-base/browser';
import {ITaskPropertyDesc} from './ITaskPropertyDesc';

import * as _ from 'lodash';


export class TaskExchangeRef extends AbstractRef implements IPropertyRef {


  descriptor: ITaskPropertyDesc;


  constructor(desc: ITaskPropertyDesc) {
    super(XS_TYPE_PROPERTY, desc.propertyName, desc.target, C_TASKS);
    this.setOptions(desc.options);
    this.descriptor = desc;
  }


  isOptional(): boolean {
    return this.getOptions('optional');
  }

  /**
   * Check if the option is set
   *
   * TODO move to commons-schema-api
   *
   * @param name
   */
  hasOption(name: string) {
    const opts = this.getOptions();
    return _.has(opts, name);
  }

  /**
   * Return the property specific customized value
   *
   * @param value
   */
  async convert(value: any): Promise<any> {
    if (this.descriptor.options && this.descriptor.options.handle) {
      return await this.descriptor.options.handle(value);
    }
    return value;
  }

  get(instance: any): any {
    throw new NotYetImplementedError();
  }

  getEntityRef(): TaskRef {
    throw new NotYetImplementedError();
  }

  getTargetRef(): IClassRef {
    throw new NotYetImplementedError();
  }

  getType(): string {
    return this.getOptions('type');
  }

  id(): string {
    return this.machineName;
  }

  isCollection(): boolean {
    const cardinality = this.getOptions('cardinality');
    return _.isNumber(cardinality) && (cardinality === 0 || cardinality > 1);
  }

  isEntityReference(): boolean {
    throw new NotYetImplementedError();
  }

  isIdentifier(): boolean {
    throw new NotYetImplementedError();
  }

  isReference(): boolean {
    throw new NotYetImplementedError();
  }

  label(): string {
    throw new NotYetImplementedError();
  }


  toJson() {
    const o = super.toJson();
    o.descriptor = _.cloneDeep(this.descriptor);
    TreeUtils.walk(o.descriptor, (v: WalkValues) => {
      if (_.isString(v.key) && _.isFunction(v.value)) {
        v.parent[v.key] = ClassUtils.getClassName(v.value);
        if (v.key === 'type' && _.isEmpty(v.parent[v.key])) {
          v.parent[v.key] = ClassUtils.getClassName(v.value());
        } else if (v.key === 'valueProvider') {
          if (!_.isFunction(v.value)) {
            // if value provider contains only of values, pass this
            v.parent[v.key] = v.value;
          } else {
            // backend returned data, set classname

          }
        }
      } else if (_.isString(v.key) && _.isUndefined(v.value)) {
        delete v.parent[v.key];
      }
    });
    return o;
  }

}
