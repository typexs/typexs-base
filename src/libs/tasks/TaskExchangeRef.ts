import {AbstractRef, IClassRef, IPropertyRef, XS_TYPE_PROPERTY} from "commons-schema-api";
import {TaskRef} from "./TaskRef";
import {C_TASKS} from "./Constants";


export class TaskExchangeRef extends AbstractRef implements IPropertyRef{

  descriptor:ITaskDesc;

  constructor(desc:ITaskDesc){
    super(XS_TYPE_PROPERTY,desc.propertyName,desc.target,C_TASKS);
    this.setOptions(desc.options);
    this.descriptor = desc;
  }

  convert(i: any): any {
  }

  get(instance: any): any {
  }

  getEntityRef(): TaskRef {
    return undefined;
  }

  getTargetRef(): IClassRef {
    return undefined;
  }

  getType(): string {
    return "";
  }

  id(): string {
    return "";
  }

  isCollection(): boolean {
    return false;
  }

  isEntityReference(): boolean {
    return false;
  }

  isIdentifier(): boolean {
    return false;
  }

  isReference(): boolean {
    return false;
  }

  label(): string {
    return "";
  }

}
