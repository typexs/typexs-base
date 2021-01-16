import * as _ from 'lodash';

import {TableMetadataArgs} from 'typeorm/browser/metadata-args/TableMetadataArgs';
import {TypeOrmPropertyRef} from './TypeOrmPropertyRef';
import {
  AbstractRef,
  IBuildOptions,
  IEntityRef,
  IEntityRefMetadata,
  IValidationMetadataArgs,
  SchemaUtils,
  XS_TYPE_ENTITY,
  XS_TYPE_PROPERTY
} from 'commons-schema-api/browser';
import {ClassUtils} from '@allgemein/base/browser';
import {REGISTRY_TYPEORM} from './TypeOrmConstants';
import {getFromContainer, MetadataStorage} from 'class-validator';
import {__CLASS__} from '../../../../Constants';

export class TypeOrmEntityRef extends AbstractRef implements IEntityRef {

  metadata: TableMetadataArgs;

  private _properties: TypeOrmPropertyRef[] = null;

  constructor(metadata: TableMetadataArgs) {
    super(XS_TYPE_ENTITY, ClassUtils.getClassName(metadata.target), metadata.target, REGISTRY_TYPEORM);
    this.setOptions(metadata);
    this.metadata = metadata;
  }


  getPropertyRefs(): TypeOrmPropertyRef[] {
    return this.getLookupRegistry().filter(XS_TYPE_PROPERTY, (e: TypeOrmPropertyRef) => e.getSourceRef().getClass() === this.getClass());
  }


  getPropertyRef(name: string): TypeOrmPropertyRef {
    return this.getPropertyRefs().find(p => p.name === name);
  }


  build<T>(instance: any, options?: IBuildOptions): T {
    return <T>SchemaUtils.transform(this, instance, options);
  }


  create<T>(): T {
    return this.getClassRef().create();
  }

  id() {
    return this.getSourceRef().id().toLowerCase();
    // _.snakeCase(_.isString(this.metadata.target) ? this.metadata.target : this.metadata.target.name)
  }

  isOf(instance: any): boolean {
    const name = ClassUtils.getClassName(instance);
    // if(name)
    if (name && name === this.name) {
      return true;
    } else if (_.has(instance, __CLASS__) && instance[__CLASS__] === this.name) {
      return true;
    } else {
      return this.getPropertyRefs()
        .map(x => _.has(instance, x.name))
        .reduce((previousValue, currentValue) => previousValue && currentValue, true);
    }


    return false;
  }


  toJson(withProperties: boolean = true): IEntityRefMetadata {
    const o = super.toJson();
    o.schema = this.object.getSchema();
    if (withProperties) {
      o.properties = this.getPropertyRefs().map(p => p.toJson());
    }

    const storage = getFromContainer(MetadataStorage);
    const metadata = storage.getTargetValidationMetadatas(this.object.getClass(), null, false, false);

    metadata.forEach(m => {
      const prop = _.find(o.properties, p => p.name === m.propertyName);
      if (prop) {
        if (!prop.validator) {
          prop.validator = [];
        }

        const args: IValidationMetadataArgs = {
          type: m.type,
          target: this.object.className,
          propertyName: m.propertyName,
          constraints: m.constraints,
          constraintCls: m.constraintCls,
          validationTypeOptions: m.validationTypeOptions,
          validationOptions: {
            // TODO since 0.9.1 context: m.context,
            message: m.message,
            groups: m.groups,
            always: m.always,
            each: m.each,
          }
        };


        prop.validator.push(args);
      }
    });

    return o;
  }


}
