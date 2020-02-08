import * as _ from 'lodash';

import {ColumnMetadataArgs} from 'typeorm/browser/metadata-args/ColumnMetadataArgs';
import {RelationMetadataArgs} from 'typeorm/browser/metadata-args/RelationMetadataArgs';
import {EmbeddedMetadataArgs} from 'typeorm/browser/metadata-args/EmbeddedMetadataArgs';

import {ClassUtils, NotYetImplementedError} from 'commons-base/browser';
import {
  AbstractRef,
  ClassRef,
  IBuildOptions,
  IPropertyRef,
  IPropertyRefMetadata,
  XS_TYPE_PROPERTY
} from 'commons-schema-api/browser';
import {TypeOrmEntityRef} from './TypeOrmEntityRef';
import {TypeOrmUtils} from '../TypeOrmUtils';
import {REGISTRY_TYPEORM} from './TypeOrmConstants';

import {TreeUtils, WalkValues} from '../../../../../browser';


export class TypeOrmPropertyRef extends AbstractRef implements IPropertyRef {

  ormPropertyType: string = null;

  targetRef: ClassRef = null;

  column: ColumnMetadataArgs = null;

  relation: RelationMetadataArgs = null;

  embedded: EmbeddedMetadataArgs = null;

  constructor(c: ColumnMetadataArgs | RelationMetadataArgs | EmbeddedMetadataArgs, type: 'column' | 'relation' | 'embedded') {
    super(XS_TYPE_PROPERTY, c.propertyName, c.target, REGISTRY_TYPEORM);
    this.setOptions(c);
    this.ormPropertyType = type;
    if (type === 'column') {
      this.column = <ColumnMetadataArgs>c;
      if (this.column.options.name) {
        this.setOption('name', this.column.options.name);
      }
      if (this.column.options.type && !_.isString(this.column.options.type)) {
        const className = ClassUtils.getClassName(this.column.options.type);
        if (!['string', 'number', 'boolean', 'date', 'float', 'array'].includes(className.toLowerCase())) {
          this.targetRef = ClassRef.get(this.column.options.type, REGISTRY_TYPEORM);
        }
      }
    } else if (type === 'embedded') {
      this.embedded = <EmbeddedMetadataArgs>c;
      this.targetRef = ClassRef.get(this.embedded.type(), REGISTRY_TYPEORM);
    } else if (type === 'relation') {
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
  }

  isCollection(): boolean {
    return (this.relation ?
      this.relation.relationType === 'one-to-many' ||
      this.relation.relationType === 'many-to-many' : false) ||
      (this.embedded ? this.embedded.isArray : false);
  }

  isReference(): boolean {
    return !!this.targetRef;
  }

  private convertRegular(data: any, options?: IBuildOptions) {
    const type = (<string>this.getType());
    if (!type || !_.isString(type)) {
      return data;
    }

    const jsType = type.toLowerCase();

    switch (jsType) {
      case 'datetime':
      case 'timestamp':
      case 'date':
        return this.convertDate(data);


      case 'time':
      case 'text':
      case 'string':
        if (_.isString(data)) {
          return data;
        } else if (_.isArray(data) && data.length === 1) {
          return data[0];
        } else if (data) {
          return JSON.stringify(data);
        } else {
          return null;
        }
        break;

      case 'boolean':

        if (_.isBoolean(data)) {
          return data;
        } else if (_.isNumber(data)) {
          return data > 0;
        } else if (_.isString(data)) {
          if (data.toLowerCase() === 'true' || data.toLowerCase() === '1') {
            return true;
          }
          return false;
        }
        break;

      // ---


      case 'double':
      case 'number':
        if (_.isString(data)) {
          if (/^\d+\.|\,\d+$/.test(data)) {
            return parseFloat(data.replace(',', '.'));
          } else if (/^\d+$/.test(data)) {
            return parseInt(data, 0);
          } else {
          }
        } else if (_.isNumber(data)) {
          return data;
        } else if (data) {
        } else {
          return null;
        }
        break;


      case 'byte':
      case 'json':
      case 'object':
      case 'array':
        return data;
    }

    throw new NotYetImplementedError('value "' + data + '" of type ' + (typeof data) + ' column type=' + jsType);
  }


  private convertDate(data: any, options?: IBuildOptions) {
    return new Date(data);
  }


  convert(data: any, options?: IBuildOptions): any {
    switch (this.column.mode) {
      case 'regular':
        return this.convertRegular(data, options);
      case 'createDate':
      case 'updateDate':
        return this.convertDate(data, options);
    }
    // if mongo no column types are defined
    return data;
    // throw new NotYetImplementedError('value ' + data + ' column type ' + this.column.options.type)
  }

  getEntityRef(): TypeOrmEntityRef {
    return this.isEntityReference() ? <TypeOrmEntityRef>(<any>this.getTargetRef().getEntityRef()) : null;
  }

  isEntityReference(): boolean {
    return !!this.relation;
  }

  getType() {
    if (!this.isReference()) {
      const type = this.column.options.type;
      if (_.isFunction(type)) {
        return ClassUtils.getClassName(type);
      } else {
        return <string>TypeOrmUtils.toJsonType(type);
      }
    }
    return null;
  }

  id() {
    return [this.getSourceRef().id(), this.name].join('--').toLowerCase();
  }

  label() {
    let label = null;
    const options = this.getOptions();
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
    const o = super.toJson();

    TreeUtils.walk(o.options, (v: WalkValues) => {
      if (_.isString(v.key) && _.isFunction(v.value)) {
        v.parent[v.key] = ClassUtils.getClassName(v.value);
        if (v.key === 'type' && _.isEmpty(v.parent[v.key])) {
          v.parent[v.key] = ClassUtils.getClassName(v.value());
        }
      } else if (_.isString(v.key) && _.isUndefined(v.value)) {
        delete v.parent[v.key];
      }
    });

    o.schema = this.getSourceRef().getSchema();
    o.entityName = this.getSourceRef().name;
    o.label = this.label();
    o.dataType = this.getType();
    o.generated = this.column ? this.column.options.generated : null;
    o.identifier = this.isIdentifier();
    o.cardinality = this.isCollection() ? 0 : 1;
    o.ormPropertyType = this.ormPropertyType;

    const targetRef = this.getTargetRef();
    if (targetRef) {
      o.targetRef = targetRef.toJson();
    }

    return o;
  }
}
