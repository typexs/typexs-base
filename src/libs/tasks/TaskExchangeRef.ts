import {AbstractRef, IClassRef, IPropertyRef, XS_TYPE_PROPERTY} from "commons-schema-api/browser";
import {TaskRef} from "./TaskRef";
import {C_TASKS} from "./Constants";
import {ClassUtils, NotYetImplementedError} from "commons-base/browser";
import {ITaskDesc} from "./ITaskDesc";
import {TreeUtils, WalkValues} from "../../libs/utils/TreeUtils";
import * as _ from "lodash";


export class TaskExchangeRef extends AbstractRef implements IPropertyRef {


  descriptor: ITaskDesc;


  constructor(desc: ITaskDesc) {
    super(XS_TYPE_PROPERTY, desc.propertyName, desc.target, C_TASKS);
    this.setOptions(desc.options);
    this.descriptor = desc;
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
    throw new NotYetImplementedError();
  }

  id(): string {
    return this.machineName;
  }

  isCollection(): boolean {
    throw new NotYetImplementedError();
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
    let o = super.toJson();
    o.descriptor = _.cloneDeep(this.descriptor);
    TreeUtils.walk(o.descriptor, (v: WalkValues) => {
      if (_.isString(v.key) && _.isFunction(v.value)) {
        v.parent[v.key] = ClassUtils.getClassName(v.value);
        if (v.key == 'type' && _.isEmpty(v.parent[v.key])) {
          v.parent[v.key] = ClassUtils.getClassName(v.value());
        }
      } else if (_.isString(v.key) && _.isUndefined(v.value)) {
        delete v.parent[v.key]
      }
    });
    return o;
  }

}
