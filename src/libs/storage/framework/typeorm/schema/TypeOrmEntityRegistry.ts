import {
  assign,
  camelCase,
  concat,
  defaults,
  defaultsDeep,
  get,
  has,
  isEmpty,
  isFunction,
  isNumber,
  isObjectLike,
  isPlainObject,
  isString,
  isUndefined,
  keys,
  map,
  snakeCase
} from 'lodash';
import {ITypeOrmEntityOptions, TypeOrmEntityRef} from './TypeOrmEntityRef';
import {TableMetadataArgs} from 'typeorm/metadata-args/TableMetadataArgs';
import {
  AbstractRef,
  ClassRef,
  DefaultNamespacedRegistry,
  IClassRef,
  IEntityOptions,
  IEntityRef,
  IJsonSchema,
  IJsonSchemaUnserializeOptions,
  IObjectOptions,
  IParseOptions,
  IPropertyOptions,
  ISchemaOptions,
  ISchemaRef,
  JsonSchema,
  LookupRegistry,
  METADATA_TYPE,
  MetadataRegistry,
  METATYPE_EMBEDDABLE,
  METATYPE_ENTITY,
  METATYPE_PROPERTY,
  METATYPE_SCHEMA,
  RegistryFactory,
} from '@allgemein/schema-api';
import {C_DEFAULT, ClassUtils, NotSupportedError, NotYetImplementedError} from '@allgemein/base';
import {ITypeOrmPropertyOptions, TypeOrmPropertyRef} from './TypeOrmPropertyRef';
import {RelationMetadataArgs} from 'typeorm/metadata-args/RelationMetadataArgs';
import {ColumnMetadataArgs} from 'typeorm/metadata-args/ColumnMetadataArgs';
import {MetadataArgsStorage} from 'typeorm/metadata-args/MetadataArgsStorage';
import {EmbeddedMetadataArgs} from 'typeorm/metadata-args/EmbeddedMetadataArgs';
import {TypeOrmUtils} from '../TypeOrmUtils';
import {isClassRef} from '@allgemein/schema-api/api/IClassRef';
import {REGISTRY_TYPEORM} from '../Constants';
import {isEntityRef} from '@allgemein/schema-api/api/IEntityRef';
import {GeneratedMetadataArgs} from 'typeorm/metadata-args/GeneratedMetadataArgs';
import {Log} from '../../../../logging/Log';
import {getMetadataArgsStorage} from 'typeorm';
import {IJsonSchemaSerializeOptions} from '@allgemein/schema-api/lib/json-schema/IJsonSchemaSerializeOptions';
import {K_IDENTIFIER, K_NULLABLE} from '../../../Constants';


export type TYPEORM_METADATA_KEYS = 'tables' |
  'trees' |
  'entityRepositories' |
  'transactionEntityManagers' |
  'transactionRepositories' |
  'namingStrategies' |
  'entitySubscribers' |
  'indices' |
  'uniques' |
  'checks' |
  'exclusions' |
  'columns' |
  'generations' |
  'relations' |
  'joinColumns' |
  'joinTables' |
  'entityListeners' |
  'relationCounts' |
  'relationIds' |
  'embeddeds' |
  'inheritances' |
  'discriminatorValues';

const typeormMetadataKeys: TYPEORM_METADATA_KEYS[] = [
  'tables',
  'trees',
  'entityRepositories',
  'transactionEntityManagers',
  'transactionRepositories',
  'namingStrategies',
  'entitySubscribers',
  'indices',
  'uniques',
  'checks',
  'exclusions',
  'columns',
  'generations',
  'relations',
  'joinColumns',
  'joinTables',
  'entityListeners',
  'relationCounts',
  'relationIds',
  'embeddeds',
  'inheritances',
  'discriminatorValues'];


const MAP_PROP_KEYS = {
  [K_IDENTIFIER]: 'primary',
  // 'generated': 'generated',
  'unique': 'unique',
  [K_NULLABLE]: K_NULLABLE,
  'cascade': 'cascade',
  'eager': 'eager'
};


export class TypeOrmEntityRegistry extends DefaultNamespacedRegistry implements IJsonSchema {


  private static _self: TypeOrmEntityRegistry;


  private metadatastore: MetadataArgsStorage = null;


  constructor(namespace: string = REGISTRY_TYPEORM) {
    super(namespace);
    this.setMaxListeners(1000);

    try {
      this.metadatastore = getMetadataArgsStorage();
      const self = this;
      for (const key of typeormMetadataKeys) {
        if (this.metadatastore[key]['__txs']) {
          continue;
        }
        this.metadatastore[key]['__txs'] = true;
        this.metadatastore[key].push = function (...args: any[]) {
          const result = Array.prototype.push.bind(this)(...args);
          self.emit('metadata_push', key, ...args);
          return result;
        };
        this.metadatastore[key].splice = function (start: number, deletecount?: number) {
          const result = Array.prototype.splice.bind(this)(start, deletecount);
          self.emit('metadata_splice', key, result, start, deletecount);
          return result;
        };
      }
      this.on('metadata_push', this.onMetaDataPush.bind(this));
      this.on('metadata_splice', this.onMetaDataSplice.bind(this));
    } catch (e) {
      Log.error(e);
    }
  }


  static $() {
    if (!this._self) {
      this._self = RegistryFactory.get(REGISTRY_TYPEORM) as TypeOrmEntityRegistry; // new TypeOrmEntityRegistry();
    }
    return this._self;
  }


  static reset() {
    const self = this.$();
    self.reset();
    this._self = null;
    LookupRegistry.reset(REGISTRY_TYPEORM);
  }


  onAdd(context: METADATA_TYPE, options: ITypeOrmEntityOptions | ITypeOrmPropertyOptions | ISchemaOptions | IObjectOptions) {
    if (options.namespace) {
      if (options.namespace !== this.namespace) {
        // skip not my namespace
        return;
      }
    } else {
      if (context !== METATYPE_PROPERTY) {
        // skip if no namespace given
        return;
      }
    }

    const target = options.target;
    const tableExists = target ? this.metadatastore.tables.find(x => x.target === target) : null;
    if (context === METATYPE_ENTITY) {
      // check if metadata exists for the entry

      if (!tableExists) {
        this.create(METATYPE_ENTITY, options as ITypeOrmEntityOptions);
        const properties = MetadataRegistry.$()
          .getByContextAndTarget(METATYPE_PROPERTY,
            options.target, 'merge') as ITypeOrmPropertyOptions[];

        for (const property of properties) {
          this.onAdd(METATYPE_PROPERTY, property);
        }
      }

    } else if (context === METATYPE_PROPERTY) {
      // todo check if table is present, else skip processing
      if (tableExists) {
        const exists = [
          this.metadatastore.columns.find(x => x.target === target && x.propertyName === options.propertyName),
          this.metadatastore.embeddeds.find(x => x.target === target && x.propertyName === options.propertyName),
          this.metadatastore.relations.find(x => x.target === target && x.propertyName === options.propertyName)
        ].find(x => !isEmpty(x));

        if (!exists) {
          const properties = MetadataRegistry.$()
            .getByContextAndTarget(METATYPE_PROPERTY,
              options.target, 'merge', options.propertyName) as ITypeOrmPropertyOptions[];
          for (const property of properties) {
            this.create(METATYPE_PROPERTY, property);
          }
        }
      }
    } else if (context === METATYPE_SCHEMA) {
      let find: ISchemaRef = this.find(context, (c: ISchemaRef) => c.name === options.name);
      if (!find) {
        find = this.create(context, options as any);
      }
      if (options.target) {
        const entityRef = this.find(METATYPE_ENTITY, (c: IEntityRef) => c.getClass() === options.target) as IEntityRef;
        if (find && entityRef) {
          this.addSchemaToEntityRef(find, entityRef);
        }
      }
    }
  }

  onUpdate() {

  }

  onRemove(context: METADATA_TYPE, entries: (IEntityOptions | IPropertyOptions | ISchemaOptions | IObjectOptions)[]) {

  }

  reset() {
    this.removeAllListeners();
    for (const key of typeormMetadataKeys) {
      delete this.metadatastore[key]['__txs'];
      this.metadatastore[key].push = Array.prototype.push.bind(this.metadatastore[key]);
      this.metadatastore[key].splice = Array.prototype.splice.bind(this.metadatastore[key]);
    }
    super.reset();
    // TODO this.lookupRegistry = null;
  }

  onMetaDataPush(key: TYPEORM_METADATA_KEYS, ...args: any[]) {
    let foundEntity = null;

    if (args[0] && args[0].new) {
      // skip processing cause already processed
      delete args[0].new;
      return;
    }

    switch (key) {
      case 'columns':
        const columnMetadata = args[0] as ColumnMetadataArgs;
        if (columnMetadata.target) {
          foundEntity = this._find(columnMetadata.target);
        }
        if (foundEntity) {
          const exists = foundEntity.getPropertyRefs()
            .find(x => x.storingName === columnMetadata.propertyName && x.getClassRef().getClass() === columnMetadata.target);
          if (!exists) {
            this.createPropertyByArgs('column', columnMetadata, true);
          }
        }
        break;
      case 'embeddeds':
        const embedded = args[0] as EmbeddedMetadataArgs;

        if (embedded.target) {
          foundEntity = this._find(embedded.target);
        }
        if (foundEntity) {
          const exists = foundEntity.getPropertyRefs()
            .find(x => x.storingName === embedded.propertyName && x.getClassRef().getClass() === embedded.target);
          if (!exists) {
            this.createPropertyByArgs('embedded', embedded, true);
          }
        }
        break;
      case 'relations':
        const relations = args[0] as RelationMetadataArgs;

        if (relations.target) {
          foundEntity = this._find(relations.target);
        }
        if (foundEntity) {
          const exists = foundEntity.getPropertyRefs()
            .find(x => x.storingName === relations.propertyName && x.getClassRef().getClass() === relations.target);
          if (!exists) {
            this.createPropertyByArgs('relation', relations, true);
          }
        }
        break;
      case 'tables':
        // const tableMetadataArgs = args[0] as TableMetadataArgs;
        // foundEntity = this._find(tableMetadataArgs.target);
        // if (!foundEntity) {
        //   this.createEntity(tableMetadataArgs);
        // }
        break;
    }
  }


  onMetaDataSplice(key: TYPEORM_METADATA_KEYS, ...args: any[]) {
    // TODO remove entities
  }


  getGlobal() {
    if (typeof window !== 'undefined') {
      return window;
    } else {
      // NativeScript uses global, not window
      return global;
    }
  }


  private findTable(f: (x: TableMetadataArgs) => boolean) {
    return this.metadatastore.tables.find(f as any);
  }


  register(xsdef: AbstractRef): AbstractRef {
    if (xsdef instanceof TypeOrmEntityRef) {
      return this.add(METATYPE_ENTITY, xsdef);
    } else if (xsdef instanceof TypeOrmPropertyRef) {
      return this.add(METATYPE_PROPERTY, xsdef);
    } else {
      throw new NotYetImplementedError();
    }
  }


  private _findTableMetadataArgs(fn: any) {
    let cName: TableMetadataArgs = null;
    if (isString(fn)) {
      cName = this.findTable(table => isString(table.target) ? table.target === fn : table.target.name === fn);
    } else if (isFunction(fn)) {
      cName = this.findTable(table => table.target === fn);
    } else if (isPlainObject(fn)) {
      cName = this.findTable(table => table.target === fn.prototype.constructor);
    } else if (isObjectLike(fn)) {
      const construct = ClassUtils.getFunction(fn);
      cName = this.findTable(table => table.target === construct);
    }
    return cName;
  }


  create<T>(context: string, options: ITypeOrmPropertyOptions | ITypeOrmEntityOptions): T {
    let update = false;
    let typeOrmOptions: any = null;
    if (context === METATYPE_ENTITY) {
      if (!options.metadata || !options.metadata.target) {
        // coming from unserialization
        typeOrmOptions = this._findTableMetadataArgs(options.target);
        if (!typeOrmOptions) {
          typeOrmOptions = <TableMetadataArgs & { new: boolean }>{
            new: true,
            target: options.target,
            type: 'regular'
          };
          assign(typeOrmOptions, options.metadata ? options.metadata : {});
          options.metadata = typeOrmOptions;
          this.metadatastore.tables.push(typeOrmOptions);
        }
      }
      const res = new TypeOrmEntityRef(options as ITypeOrmEntityOptions);
      this.register(res);
      const metaSchemaOptionsForEntity = MetadataRegistry.$()
        .getByContextAndTarget(METATYPE_SCHEMA, res.getClass());

      if (metaSchemaOptionsForEntity.length > 0) {
        for (const schemaOptions of metaSchemaOptionsForEntity) {
          this.addSchemaToEntityRef(schemaOptions.name, res);
        }
      } else {
        this.addSchemaToEntityRef(C_DEFAULT, res);
      }
      return res as any;
    } else if (context === METATYPE_PROPERTY) {
      // remove cardinality is checked by property ref

      let generated: GeneratedMetadataArgs = null;
      let tableType = 'column';
      let isArray = !isUndefined(options.cardinality) && isNumber(options.cardinality) && options.cardinality !== 1;

      // correct type for typeorm
      let clsRef: IClassRef = null;
      let clsType: Function = options.type;
      if (isString(options.type)) {
        clsType = TypeOrmUtils.getJsObjectType(options.type);
        if (!clsType) {
          tableType = 'relation';
          clsRef = ClassRef.find(options.type);
          if (clsRef) {
            clsType = clsRef.getClass();
          } else {
            clsRef = ClassRef.get(options.type, this.namespace);
            clsType = clsRef.getClass(true);
          }
        } else if (clsType === Array) {
          isArray = true;
        }
      } else if (isClassRef(clsType) || isEntityRef(clsType)) {
        clsRef = isEntityRef(clsType) ? clsType.getClassRef() : clsType;
        tableType = 'relation';
        clsType = clsType.getClass();
      } else {
        tableType = 'relation';
        clsType = options.type;
      }


      tableType = get(options, 'tableType', tableType);
      // const cardinality = options['cardinality'] ? options['cardinality'] : 1;
      delete options['cardinality'];

      switch (tableType) {
        case 'column':
          typeOrmOptions = this.metadatastore.columns.find(x => x.target === options.target && x.propertyName === options.propertyName);
          break;
        case 'embedded':
          typeOrmOptions = this.metadatastore.embeddeds.find(x => x.target === options.target && x.propertyName === options.propertyName);
          break;
        case 'relation':
          typeOrmOptions = this.metadatastore.relations.find(x => x.target === options.target && x.propertyName === options.propertyName);
          break;
      }

      if (!options.metadata || !options.metadata.target) {
        // coming from unserialization
        // no metadata create default
        if (!typeOrmOptions) {
          typeOrmOptions = {
            new: true,
            target: options.target,
            propertyName: options.propertyName
          };

          if (options.metadata) {
            defaults(typeOrmOptions, options.metadata);
          }
          update = true;
        }

        if (!typeOrmOptions.options) {
          typeOrmOptions.options = {};
        }
        typeOrmOptions.options.type = clsType;
        typeOrmOptions.options.name = snakeCase(typeOrmOptions.propertyName);

        defaults(typeOrmOptions, {
          propertyName: options.propertyName,
          target: options.target
        });

        let reversePropName = null;
        let refIdName = null;
        if (tableType === 'relation' && !typeOrmOptions.type) {
          typeOrmOptions.type = (type: any) => clsType;
          const ids = clsRef.getPropertyRefs().filter(x => x.isIdentifier());
          if (ids.length === 1) {
            refIdName = ids.shift().name;
            reversePropName = camelCase([(options.target as any).name, options.propertyName].join('_'));
            typeOrmOptions.inverseSideProperty = function (reversePropName) {
              return (x: any) => x[reversePropName];
            }(reversePropName);
          } else {
            throw new NotYetImplementedError('TODO');
          }
        } else if (tableType === 'column') {
          typeOrmOptions.mode = 'regular';
        }

        if (typeOrmOptions.new) {
          if (tableType === 'column') {
            const _defaults = <ColumnMetadataArgs>{
              options: {
                type: clsType as any
              }
            };
            for (const x of keys(MAP_PROP_KEYS)) {
              if (has(options, x)) {
                _defaults.options[MAP_PROP_KEYS[x]] = options[x];
              }
            }
            defaultsDeep(typeOrmOptions, _defaults);
            if (options.generated) {
              generated = {
                target: options.target,
                propertyName: options.propertyName,
                strategy: 'increment'
              };
            }
          } else if (tableType === 'relation') {
            defaultsDeep(typeOrmOptions, <RelationMetadataArgs>{
              type: () => clsType,
              isLazy: false,
              relationType: !isArray ? 'one-to-one' : 'many-to-many',
              options: {
                cascade: true,
                eager: true
              }
            });
          }
        }

        options.tableType = tableType;
        options.metadata = typeOrmOptions;

        if (update) {
          switch (tableType) {
            case 'column':
              this.metadatastore.columns.push(typeOrmOptions);
              if (generated) {
                this.metadatastore.generations.push(generated);
              }
              break;
            case 'embedded':
              this.metadatastore.embeddeds.push(typeOrmOptions);
              break;
            case 'relation':
              this.metadatastore.relations.push(typeOrmOptions);
              if ((<RelationMetadataArgs>typeOrmOptions).relationType === 'one-to-one') {
                this.metadatastore.joinColumns.push({
                  target: options.target,
                  propertyName: options.propertyName,
                  name: [options.propertyName, refIdName].map(x => snakeCase(x)).join('_')
                });
              } else if ((<RelationMetadataArgs>typeOrmOptions).relationType === 'many-to-many') {
                // const revPropName = camelCase([(options.target as any).name, options.propertyName].join('_'));
                const ids = this.metadatastore.columns.filter(x => x.target === options.target && x.options.primary);
                let idName = null;
                if (ids.length === 1) {
                  idName = ids.shift().propertyName;
                } else {
                  throw new NotYetImplementedError('TODO');
                }
                const joinTable = {
                  name: snakeCase([(options.target as any).name, options.propertyName].join('_')),
                  target: options.target,
                  propertyName: options.propertyName,
                  joinColumns: [{
                    propertyName: options.propertyName,
                    target: options.target,
                    referencedColumnName: idName
                  }],
                  inverseJoinColumns: [{
                    target: clsType,
                    propertyName: reversePropName,
                    referencedColumnName: refIdName
                  }]
                };
                this.metadatastore.joinTables.push(joinTable);
              }
              break;
          }
        }
      }

      const propRef = new TypeOrmPropertyRef(options as ITypeOrmPropertyOptions);
      this.register(propRef);
      return propRef as any;
    } else if (context === METATYPE_EMBEDDABLE) {
      return this.createEmbeddableForOptions(options as any) as any;
    } else if (context === METATYPE_SCHEMA) {
      return this.createSchemaForOptions(options as any) as any;
    }
    throw new NotSupportedError('');
  }


  createPropertyByArgs(type: 'column' | 'relation' | 'embedded',
                       args: ColumnMetadataArgs | RelationMetadataArgs | EmbeddedMetadataArgs,
                       recursive: boolean = false) {
    const propertyOptions: ITypeOrmPropertyOptions = {
      metadata: args,
      target: args.target as any,
      tableType: type,
      namespace: this.namespace,
      propertyName: args.propertyName
    };

    const propRef = this.create<TypeOrmPropertyRef>(METATYPE_PROPERTY, propertyOptions);
    if (recursive && propRef.isReference()) {
      const classRef = propRef.getTargetRef();
      if (!classRef.getEntityRef()) {
        const metadata = this._findTableMetadataArgs(classRef.getClass());
        if (metadata) {
          this.createEntity(metadata);
        }
      }
    }
    return propRef;
  }


  createEntity(fn: TableMetadataArgs) {
    // check if entity exists?
    const entityOptions: ITypeOrmEntityOptions = {
      metadata: fn
    };
    const entity = this.create<TypeOrmEntityRef>(METATYPE_ENTITY, entityOptions);
    const properties: TypeOrmPropertyRef[] = <TypeOrmPropertyRef[]>concat(
      map(this.metadatastore.columns
          .filter(c => c.target === fn.target),
        c => this.createPropertyByArgs('column', c)),
      map(this.metadatastore.filterRelations(fn.target),
        c => this.createPropertyByArgs('relation', c))
    );

    map(this.metadatastore.filterEmbeddeds(fn.target),
      c => {
        const exists = properties.find(x => x.storingName === c.propertyName && x.getClass() === c.target);
        if (!exists) {
          const r = this.createPropertyByArgs('embedded', c);
          properties.push(r);
        }
      });

    properties.filter(p => p.isReference()).map(p => {
      const classRef = p.getTargetRef();
      if (!classRef.hasEntityRef()) {
        const metadata = this._findTableMetadataArgs(classRef.getClass());
        if (metadata) {
          this.createEntity(metadata);
        }
      }
    });
    return entity;
  }


  private _find(instance: any): TypeOrmEntityRef {
    const cName = ClassUtils.getClassName(instance);
    return this.getEntityRefByName(cName);
  }


  getEntityRefByName(name: string): TypeOrmEntityRef {
    return this.find(METATYPE_ENTITY, (e: TypeOrmEntityRef) => {
      return e.machineName === snakeCase(name);
    });
  }


  getEntityRefFor(instance: string | object | Function, skipNsCheck: boolean = false): TypeOrmEntityRef {
    if (!instance) {
      return null;
    }
    const entityRef = this._find(instance);
    if (entityRef) {
      return entityRef;
    }

    if (this.metadatastore) {
      const metadata = this._findTableMetadataArgs(instance);
      if (metadata) {
        return this.createEntity(metadata);
      }
    }
    return null;
  }

  /**
   * Return all entities in this registry
   */
  getEntityRefs(): TypeOrmEntityRef[] {
    return this.list(METATYPE_ENTITY) as TypeOrmEntityRef[];
  }


  getPropertyRefs(ref: IClassRef | IEntityRef): TypeOrmPropertyRef[] {
    return this.getPropertyRefsFor(ref);
  }

  getPropertyRefsFor(entity: IEntityRef | IClassRef): TypeOrmPropertyRef[] {
    if (entity instanceof TypeOrmEntityRef) {
      return this.filter(METATYPE_PROPERTY,
        (x: TypeOrmPropertyRef) => x.getSourceRef().id() === entity.getClassRef().id());
    } else {
      return this.filter(METATYPE_PROPERTY, (x: TypeOrmPropertyRef) => {
        return x.getSourceRef().id() === entity.id();
      });
    }
  }

  add<T>(context: string, entry: T): T {
    return this.getLookupRegistry().add(context, entry);
  }


  fromJsonSchema(json: any, options?: IJsonSchemaUnserializeOptions) {
    return JsonSchema.unserialize(json, defaults(options || {}, {
        namespace: this.namespace,
        collector: [
          {
            type: METATYPE_PROPERTY,
            key: 'type',
            fn: (key: string, data: any, options: IParseOptions) => {
              const type = ['string', 'number', 'boolean', 'date', 'float', 'array', 'object'];
              const value = data[key];
              if (value && type.includes(value)) {
                const cls = TypeOrmUtils.getJsObjectType(value);
                if (cls === String) {
                  if (data['format'] === 'date' || data['format'] === 'date-time') {
                    return Date;
                  }
                }
                return cls;
              } else if (data['$ref']) {
                const className = data['$ref'].split('/').pop();
                return ClassRef.get(className, this.namespace).getClass(true);
              }
              return ClassRef.get(data[key], this.namespace).getClass(true);
            }
          }
        ]
      })
    );
  }

  toJsonSchema(options?: IJsonSchemaSerializeOptions): any {
    const serializer = JsonSchema.getSerializer(options);
    for (const entityRef of this.getEntityRefs()) {
      serializer.serialize(entityRef);
    }
    return serializer.getJsonSchema();
  }
}
