import {capitalize, defaults, get, has, isArray, isBoolean, isEmpty, isFunction, isNumber, isString} from 'lodash';

import {ColumnMetadataArgs} from 'typeorm/metadata-args/ColumnMetadataArgs';
import {RelationMetadataArgs} from 'typeorm/metadata-args/RelationMetadataArgs';
import {EmbeddedMetadataArgs} from 'typeorm/metadata-args/EmbeddedMetadataArgs';
import {ClassUtils, NotSupportedError, NotYetImplementedError} from '@allgemein/base';
import {DefaultPropertyRef, IBuildOptions, IClassRef, IPropertyOptions, METATYPE_PROPERTY} from '@allgemein/schema-api';
import {TypeOrmEntityRef} from './TypeOrmEntityRef';
import {TypeOrmUtils} from '../TypeOrmUtils';
import {REGISTRY_TYPEORM} from '../Constants';

export interface ITypeOrmPropertyOptions extends IPropertyOptions {
  metadata: ColumnMetadataArgs | RelationMetadataArgs | EmbeddedMetadataArgs;
  tableType: 'column' | 'relation' | 'embedded';
}


export class TypeOrmPropertyRef extends DefaultPropertyRef /*AbstractRef implements IPropertyRef*/ {

  column: ColumnMetadataArgs = null;

  relation: RelationMetadataArgs = null;

  embedded: EmbeddedMetadataArgs = null;

  get ormtype() {
    return this.getOptions('tableType');
  }

  constructor(options: ITypeOrmPropertyOptions) {
    // super(METATYPE_PROPERTY, c.propertyName, c.target, REGISTRY_TYPEORM);
    super(defaults(options, <ITypeOrmPropertyOptions>{
      metaType: METATYPE_PROPERTY,
      namespace: REGISTRY_TYPEORM,
      target: options.metadata.target,
      propertyName: options.metadata.propertyName
    }));
    if (has(options, 'metadata.new')) {
      delete options.metadata['new'];
    }
    this.setOptions(options);
    if (this.ormtype === 'column') {
      this.column = <ColumnMetadataArgs>options.metadata;
      if (this.column.options.name) {
        this.setOption('name', this.column.options.name);
      }
      if (this.column.options.type && !isString(this.column.options.type)) {
        const className = ClassUtils.getClassName(this.column.options.type);
        if (!['string', 'number', 'boolean', 'date', 'float', 'array'].includes(className.toLowerCase())) {
          this.targetRef = this.getClassRefFor(this.column.options.type, METATYPE_PROPERTY);
        }
      }
    } else if (this.ormtype === 'embedded') {
      this.embedded = <EmbeddedMetadataArgs>options.metadata;
      this.targetRef = this.getClassRefFor((this.embedded.type()), METATYPE_PROPERTY);
    } else if (this.ormtype === 'relation') {
      this.relation = <RelationMetadataArgs>options.metadata;

      this.cardinality = 0;
      if (this.relation.relationType === 'one-to-one' || this.relation.relationType === 'many-to-one') {
        this.cardinality = 1;
      }

      if ((isFunction(this.relation.type) && !isEmpty(this.relation.type.name)) || isString(this.relation.type)) {
        this.targetRef = this.getClassRefFor(this.relation.type, METATYPE_PROPERTY);
      } else if (isFunction(this.relation.type)) {
        const resolveType = this.relation.type();
        this.targetRef = this.getClassRefFor(resolveType, METATYPE_PROPERTY);
      }
      // this.targetRef.isEntity = true;
    }
  }


  get identifier() {
    return this.column ? this.column.options.primary : false;
  }


  isIdentifier(): boolean {
    return this.identifier;
  }

  isPattern(): boolean {
    throw new NotSupportedError('isPattern is not supported');
  }

  getTargetRef(): IClassRef {
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
    const sourceType = this.getOptions('sourceType', <string>this.getType());
    if (!sourceType || !isString(sourceType)) {
      return data;
    }

    const jsType = sourceType.toLowerCase();

    switch (jsType) {
      case 'datetime':
      case 'timestamp':
      case 'date':
        return this.convertDate(data);


      case 'time':
      case 'text':
      case 'string':
        if (isString(data)) {
          return data;
        } else if (isArray(data) && data.length === 1) {
          return data[0];
        } else if (data) {
          return JSON.stringify(data);
        } else {
          return null;
        }
        break;

      case 'boolean':

        if (isBoolean(data)) {
          return data;
        } else if (isNumber(data)) {
          return data > 0;
        } else if (isString(data)) {
          if (data.toLowerCase() === 'true' || data.toLowerCase() === '1') {
            return true;
          }
          return false;
        }
        break;

      case 'double':
      case 'number':
        if (isString(data)) {
          if (/^\d+\.|\,\d+$/.test(data)) {
            return parseFloat(data.replace(',', '.'));
          } else if (/^\d+$/.test(data)) {
            return parseInt(data, 0);
          } else {
          }
        } else if (isNumber(data)) {
          return data;
        } else if (isBoolean(data)) {
          return data ? 1 : 0;
        } else {
          // Pass to exception
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

  /**
   * Check if type of this property is structured
   */
  isStructuredType() {
    const type = (<string>this.getType());
    if (!type || !isString(type)) {
      return false;
    }

    const jsType = type.toLowerCase();
    return ['json', 'object', 'array'].includes(jsType);
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
      if (isFunction(type)) {
        const name = ClassUtils.getClassName(type);
        if (['string', 'number', 'boolean', 'date', 'float', 'array', 'object'].includes(name.toLowerCase())) {
          return name.toLowerCase();
        }
        return name;
      } else {
        return TypeOrmUtils.toJsonType(type) as any;
      }
    }
    return this.getTargetRef().getClass();
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
      label = capitalize(this.name);
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
      return get(instance, this.name, null);
    } else {
      return null;
    }
  }


  // toJson(): IPropertyRefMetadata {
  //   const o = super.toJson();
  //
  //   TreeUtils.walk(o.options, (v: WalkValues) => {
  //     if (isString(v.key) && isFunction(v.value)) {
  //       v.parent[v.key] = ClassUtils.getClassName(v.value);
  //       if (v.key === 'type' && isEmpty(v.parent[v.key])) {
  //         v.parent[v.key] = ClassUtils.getClassName(v.value());
  //       }
  //     } else if (isString(v.key) && isUndefined(v.value)) {
  //       delete v.parent[v.key];
  //     }
  //   });
  //
  //   o.schema = this.getSourceRef().getSchema();
  //   o.entityName = this.getSourceRef().name;
  //   o.label = this.label();
  //   o.dataType = this.getType();
  //   o.generated = this.column ? this.column.options.generated : null;
  //   o.identifier = this.isIdentifier();
  //   o.cardinality = this.isCollection() ? 0 : 1;
  //   o.ormtype = this.ormtype;
  //
  //   const targetRef = this.getTargetRef();
  //   if (targetRef) {
  //     o.targetRef = targetRef.toJson();
  //   }
  //
  //   return o;
  // }

}
