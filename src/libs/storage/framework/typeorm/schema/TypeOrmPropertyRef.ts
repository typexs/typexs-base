import * as _ from 'lodash';

import {ColumnMetadataArgs} from "typeorm/browser/metadata-args/ColumnMetadataArgs";
import {RelationMetadataArgs} from "typeorm/browser/metadata-args/RelationMetadataArgs";
import {ColumnType} from "typeorm/browser";

import {ClassUtils, NotYetImplementedError} from "commons-base/browser";
import {AbstractRef, ClassRef, IPropertyRef, IPropertyRefMetadata, XS_TYPE_PROPERTY} from "commons-schema-api/browser";
import {TypeOrmEntityRef} from "./TypeOrmEntityRef";
import {TypeOrmUtils} from "../TypeOrmUtils";
import {REGISTRY_TYPEORM} from "./TypeOrmConstants";

import {TreeUtils, WalkValues} from "../../../../../browser";


export class TypeOrmPropertyRef extends AbstractRef implements IPropertyRef {

  targetRef: ClassRef = null;

  column: ColumnMetadataArgs = null;

  relation: RelationMetadataArgs = null;


  constructor(c: ColumnMetadataArgs | RelationMetadataArgs, type: 'column' | 'relation') {
    super(XS_TYPE_PROPERTY, c.propertyName, c.target, REGISTRY_TYPEORM);
    this.setOptions(c);
    if (type == 'column') {
      this.column = <ColumnMetadataArgs>c;
      this.column.options.name ? this.setOption('name', this.column.options.name) : null;
    } else if (type == 'relation') {
      this.relation = <RelationMetadataArgs>c;


      if ((_.isFunction(this.relation.type) && !_.isEmpty(this.relation.type.name)) || _.isString(this.relation.type)) {
        this.targetRef = ClassRef.get(this.relation.type, REGISTRY_TYPEORM);
      } else if (_.isFunction(this.relation.type)) {
        this.targetRef = ClassRef.get(this.relation.type(), REGISTRY_TYPEORM);
      }

      this.targetRef.isEntity = true;
    }
  }


  get identifier() {
    return this.column ? this.column.options.primary : false;
  }


  isIdentifier(): boolean {
    return this.identifier;
  }


  getTargetRef(): ClassRef {
    return this.targetRef;
    /*
    if (this.isReference()) {
      if ((_.isFunction(this.relation.type) && !_.isEmpty(this.relation.type.name)) || _.isString(this.relation.type)) {
        return TypeOrmEntityRegistry.$().getEntityDefFor(this.relation.type)
      } else if (_.isFunction(this.relation.type)) {
        return TypeOrmEntityRegistry.$().getEntityDefFor(this.relation.type())
      }
      throw new NotSupportedError('unknown relation type ' + JSON.stringify(this.relation))
    } else {
      throw new NotSupportedError('get target ref is empty')
    }
    */

  }

  isCollection(): boolean {
    return this.isReference() ? this.relation.relationType == 'one-to-many' || this.relation.relationType == 'many-to-many' : false;
  }

  isReference(): boolean {
    return !!this.relation;
  }

  private convertRegular(data: any) {

    let jsType = (<string>this.getType()).toLowerCase();


    switch (jsType) {
      case "datetime":
      case "timestamp":
      case "date":
        return this.convertDate(data);


      case "time":
      case "text":
      case "string":
        if (_.isString(data)) {
          return data;
        } else if (data) {

        } else {
          return null;
        }
        break;

      case "boolean":

        if (_.isBoolean(data)) {
          return data;
        } else if (_.isNumber(data)) {
          return data > 0;
        } else if (_.isString(data)) {
          if (data.toLowerCase() === "true" || data.toLowerCase() === "1") {
            return true;
          }
          return false;
        }
        break;

      // ---

      case "byte":
      case "json":
        return data;

      case "double":
      case "number":
        if (_.isString(data)) {
          if (/^\d+\.|\,\d+$/.test(data)) {
            return parseFloat(data.replace(',', '.'))
          } else if (/^\d+$/.test(data)) {
            return parseInt(data);
          } else {
          }
        } else if (_.isNumber(data)) {
          return data;
        } else if (data) {
        } else {
          return null;
        }
        break;

    }

    throw new NotYetImplementedError('value ' + data + ' column type ' + this.column.options.type)
  }

  private convertDate(data: any) {
    return new Date(data);
  }

  convert(data: any): any {
    switch (this.column.mode) {
      case "regular":
        return this.convertRegular(data);
      case "createDate":
      case "updateDate":
        return this.convertDate(data);
    }
    throw new NotYetImplementedError('value ' + data + ' column type ' + this.column.options.type)
  }

  getEntityRef(): TypeOrmEntityRef {
    return this.isEntityReference() ? <TypeOrmEntityRef>(<any>this.getTargetRef().getEntityRef()) : null;
  }

  isEntityReference(): boolean {
    return this.isReference();
  }

  getType() {
    if (!this.isReference()) {
      let type = this.column.options.type;
      if (_.isFunction(type)) {
        return <ColumnType>ClassUtils.getClassName(type);
      } else {
        return TypeOrmUtils.toJsonType(type)
      }
    }
    return null;
  }

  id() {
    return [this.getSourceRef().id(), this.name].join('--').toLowerCase();
  }

  label() {
    let label = null;
    let options = this.getOptions();
    if (options.label) {
      label = options.label;
    }
    if (!label) {
      label = _.capitalize(this.name);
    } else {
      label = 'None';
    }
    return label;
  }

  /**
   * retrieve propetry from an instance
   * @param instance
   */
  get(instance: any) {
    if (instance) {
      return _.get(instance, this.name, null);
    } else {
      return null;
    }
  }


  toJson(): IPropertyRefMetadata {
    let o = super.toJson();

    TreeUtils.walk(o.options,(v:WalkValues) => {
      if(_.isString(v.key) && _.isFunction(v.value)){
        v.parent[v.key] = ClassUtils.getClassName(v.value);
        if(v.key == 'type' && _.isEmpty(v.parent[v.key])){
          v.parent[v.key] = ClassUtils.getClassName(v.value());
        }
      }else if(_.isString(v.key) && _.isUndefined(v.value)){
        delete v.parent[v.key]
      }
    });

    o.schema = this.getSourceRef().getSchema();
    o.entityName = this.getSourceRef().name;
    o.label = this.label();
    o.dataType = this.getType();
    o.generated = this.column ? this.column.options.generated : null;
    o.identifier = this.isIdentifier();
    o.cardinality = this.isCollection() ? 0 : 1;

    const targetRef = this.getTargetRef();
    if (targetRef) {
      o.targetRef = targetRef.toJson();
    }

    return o;
  }
}
