import {defaults, has} from 'lodash';
import {TableMetadataArgs} from 'typeorm/metadata-args/TableMetadataArgs';
import {ClassRef, DefaultEntityRef, IEntityOptions, JsonSchema, METATYPE_PROPERTY} from '@allgemein/schema-api';
import {IJsonSchemaSerializeOptions} from '@allgemein/schema-api/lib/json-schema/IJsonSchemaSerializeOptions';
import {REGISTRY_TYPEORM} from '../Constants';

export interface ITypeOrmEntityOptions extends IEntityOptions {
  metadata: TableMetadataArgs;
}

export class TypeOrmEntityRef extends DefaultEntityRef {

  constructor(options: ITypeOrmEntityOptions) {
    super(defaults(options, <ITypeOrmEntityOptions>{
      metaType: METATYPE_PROPERTY,
      namespace: REGISTRY_TYPEORM,
      target: options.metadata.target,
      name: ClassRef.getClassName(options.metadata.target)
    }));
    if (has(options, 'metadata.new')) {
      delete options.metadata['new'];
    }

    this.setOptions(options);
  }

  get metadata() {
    return this.getOptions('metadata');
  }

  id() {
    return this.getSourceRef().id().toLowerCase();
  }


  toJsonSchema(options: IJsonSchemaSerializeOptions = {}) {
    options = options || {};
    return JsonSchema.serialize(this, {
      ...options,
      namespace: this.namespace,
      allowKeyOverride: true,
      deleteReferenceKeys: false,
      postProcess: (src, dst, serializer) => {
        if (has(dst, 'cardinality')) {
          delete dst['cardinality'];
        }
      }
    });
  }


}
