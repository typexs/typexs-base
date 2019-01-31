import {IPropertyDef} from "./IPropertyDef";

export interface IClassRef {
  storingName: string;

  getPropertyDef(name: string): IPropertyDef;

  getPropertyDefs(): IPropertyDef[];
}
