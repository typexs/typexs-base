import {ExprDesc} from '@allgemein/expressions';
import {IPropertyRef} from '@allgemein/schema-api';

export interface IValueProvider<T> {

  get(entity?: any, property?: IPropertyRef, hint?: ExprDesc): T;

}
