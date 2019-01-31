import {IPropertyDef} from "./IPropertyDef";
import {IClassRef} from "./IClassRef";

export interface IEntityDef {
  name: string;

  storingName: string;

  getPropertyDef(name: string): IPropertyDef;

  getPropertyDefs(): IPropertyDef[];

  getClassRef(): IClassRef;


}
