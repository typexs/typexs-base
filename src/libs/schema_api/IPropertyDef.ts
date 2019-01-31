import {IClassRef} from "./IClassRef";

export interface IPropertyDef {
  name: string;

  storingName: string;

  identifier:boolean;

  isIdentifier():boolean;

  isReference(): boolean;

  getTargetRef(): IClassRef;

  isCollection(): boolean;
}
