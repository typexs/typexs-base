import * as _ from "lodash";

import {TableMetadataArgs} from "typeorm/browser/metadata-args/TableMetadataArgs";
import {TypeOrmPropertyRef} from "./TypeOrmPropertyRef";
import {
  AbstractRef,
  IBuildOptions,
  IEntityRef,
  IEntityRefMetadata,
  IValidationMetadataArgs,
  SchemaUtils,
  XS_TYPE_ENTITY,
  XS_TYPE_PROPERTY
} from "commons-schema-api/browser";
import {ClassUtils} from "commons-base/browser";
import {REGISTRY_TYPEORM} from "./TypeOrmConstants";
import {getFromContainer, MetadataStorage} from "class-validator";

export class TypeOrmEntityRef extends AbstractRef implements IEntityRef {

  metadata: TableMetadataArgs;

  private _properties: TypeOrmPropertyRef[] = null;

  constructor(metadata: TableMetadataArgs) {
    super(XS_TYPE_ENTITY, ClassUtils.getClassName(metadata.target), metadata.target, REGISTRY_TYPEORM);
    this.setOptions(metadata);
    this.metadata = metadata;
  }

  /*
*/

  getPropertyRefs(): TypeOrmPropertyRef[] {
    return this.getLookupRegistry().filter(XS_TYPE_PROPERTY, (e: TypeOrmPropertyRef) => e.getSourceRef().getClass() === this.getClass());
  }


  getPropertyRef(name: string): TypeOrmPropertyRef {
    return this.getPropertyRefs().find(p => p.name == name);
  }

  /*
    getPropertyDefs(): TypeOrmPropertyRef[] {
      if (!this._properties) {
        this._properties = _.concat(
          _.map(getMetadataArgsStorage().columns
              .filter(c => c.target == this.metadata.target),
            c => new TypeOrmPropertyRef(c, 'column')),
          _.map(getMetadataArgsStorage().filterRelations(this.metadata.target),
            c => new TypeOrmPropertyRef(c, 'relation')),
        );
      }
      return this._properties;
    }
  */

  build<T>(instance: any, options?: IBuildOptions): T {
    return <T>SchemaUtils.transform(this, instance, options);
  }


  create<T>(): T {
    return this.getClassRef().create();
  }

  id() {
    return this.getSourceRef().id().toLowerCase(); //_.snakeCase(_.isString(this.metadata.target) ? this.metadata.target : this.metadata.target.name)
  }


  toJson(withProperties: boolean = true): IEntityRefMetadata {
    let o = super.toJson();
    o.schema = this.object.getSchema();
    if (withProperties) {
      o.properties = this.getPropertyRefs().map(p => p.toJson());
    }

    let storage = getFromContainer(MetadataStorage);
    let metadata = storage.getTargetValidationMetadatas(this.object.getClass(), null);

    metadata.forEach(m => {
      let prop = _.find(o.properties, p => p.name === m.propertyName);
      if (prop) {
        if (!prop.validator) {
          prop.validator = [];
        }

        let args: IValidationMetadataArgs = {
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
