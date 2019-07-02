import {ExprDesc} from 'commons-expressions/browser';
import {IPropertyRef} from 'commons-schema-api/browser';

export interface IValueProvider<T> {

  get(entity?: any, property?: IPropertyRef, hint?: ExprDesc): T;

}
