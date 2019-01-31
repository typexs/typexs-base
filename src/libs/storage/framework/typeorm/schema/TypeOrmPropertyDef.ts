import * as _ from 'lodash';

import {ColumnMetadataArgs} from "typeorm/browser/metadata-args/ColumnMetadataArgs";
import {RelationMetadataArgs} from "typeorm/browser/metadata-args/RelationMetadataArgs";
import {TypeOrmEntityLookupRegistry} from "./TypeOrmEntityLookupRegistry";
import {NotSupportedError} from "commons-base";
import {IPropertyDef} from "../../../../schema_api/IPropertyDef";
import {IClassRef} from "../../../../schema_api/IClassRef";

export class TypeOrmPropertyDef implements IPropertyDef {

  private _propertyName: string;

  private _storingName: string;


  column: ColumnMetadataArgs;

  relation: RelationMetadataArgs = null;

  constructor(c: ColumnMetadataArgs | RelationMetadataArgs, type: 'column' | 'relation') {
    if (type == 'column') {
      this.column = <ColumnMetadataArgs>c;
      this._propertyName = this.column.propertyName;
      this._storingName = this.column.options.name ? this.column.options.name : this.column.propertyName;
    } else if (type == 'relation') {
      this.relation = <RelationMetadataArgs>c;
      this._propertyName = this.relation.propertyName;
    }
  }

  get name() {
    return this._propertyName;
  }

  get storingName() {
    return this._storingName;
  }

  get identifier() {
    return this.column ? this.column.options.primary : false;
  }

  isIdentifier(): boolean {
    return this.identifier;
  }

  getTargetRef(): IClassRef {
    if (this.isReference()) {
      if ((_.isFunction(this.relation.type) && !_.isEmpty(this.relation.type.name)) || _.isString(this.relation.type)) {
        return TypeOrmEntityLookupRegistry.$().getEntityDefFor(this.relation.type)
      } else if (_.isFunction(this.relation.type)) {
        return TypeOrmEntityLookupRegistry.$().getEntityDefFor(this.relation.type())
      }
      throw new NotSupportedError('unknown relation type ' + JSON.stringify(this.relation))
    } else {
      throw new NotSupportedError('get target ref is empty')
    }

  }

  isCollection(): boolean {
    return this.isReference() ? this.relation.relationType == 'one-to-many' || this.relation.relationType == 'many-to-many' : false;
  }

  isReference(): boolean {
    return !!this.relation;
  }
}
