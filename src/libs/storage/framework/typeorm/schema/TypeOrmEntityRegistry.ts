import * as _ from 'lodash';
import {ITypeOrmEntityOptions, TypeOrmEntityRef} from './TypeOrmEntityRef';
import {TableMetadataArgs} from 'typeorm/browser/metadata-args/TableMetadataArgs';
import {
  AbstractRef,
  ClassRef,
  DefaultNamespacedRegistry,
  IClassRef,
  IEntityOptions,
  IEntityRef,
  IObjectOptions,
  IPropertyOptions,
  ISchemaOptions,
  JsonSchema,
  LookupRegistry,
  METADATA_TYPE,
  MetadataRegistry,
  METATYPE_ENTITY,
  METATYPE_PROPERTY,
  RegistryFactory,
} from '@allgemein/schema-api';
import {ClassUtils, NotSupportedError, NotYetImplementedError} from '@allgemein/base';
import {ITypeOrmPropertyOptions, TypeOrmPropertyRef} from './TypeOrmPropertyRef';
import {RelationMetadataArgs} from 'typeorm/browser/metadata-args/RelationMetadataArgs';
import {ColumnMetadataArgs} from 'typeorm/browser/metadata-args/ColumnMetadataArgs';
import {MetadataArgsStorage} from 'typeorm/browser/metadata-args/MetadataArgsStorage';
import {EmbeddedMetadataArgs} from 'typeorm/browser/metadata-args/EmbeddedMetadataArgs';
import {TypeOrmUtils} from '../TypeOrmUtils';
import {isClassRef} from '@allgemein/schema-api/api/IClassRef';
import {REGISTRY_TYPEORM} from '../Constants';


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
  'identifier': 'primary',
  'generated': 'generated',
  'unique': 'unique',
  'nullable': 'nullable'
};


export class TypeOrmEntityRegistry extends DefaultNamespacedRegistry/*AbstractRegistry /*EventEmitter implements ILookupRegistry*/ {


  private static _self: TypeOrmEntityRegistry;


  private metadatastore: MetadataArgsStorage = null;


  constructor(namespace: string = REGISTRY_TYPEORM) {
    super(namespace);
    this.setMaxListeners(1000);

    // this.lookupRegistry = LookupRegistry.$(REGISTRY_TYPEORM);
    try {
      this.metadatastore = this.getGlobal()['typeormMetadataArgsStorage'];
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

    if (context === METATYPE_ENTITY) {
      // check if metadata exists for the entry
      const exists = this.metadatastore.tables.find(x => x.target === options.target);
      if (!exists) {
        const target = options.target;
        this.create(METATYPE_ENTITY, options as ITypeOrmEntityOptions);

        const properties = MetadataRegistry.$()
          .getByContextAndTarget(METATYPE_PROPERTY,
            options.target, 'merge') as ITypeOrmPropertyOptions[];
        for (const property of properties) {
          this.onAdd(METATYPE_PROPERTY, property);
        }
      }

    } else if (context === METATYPE_PROPERTY) {
      const exists = [
        this.metadatastore.columns.find(x => x.target === options.target && x.propertyName === options.propertyName),
        this.metadatastore.embeddeds.find(x => x.target === options.target && x.propertyName === options.propertyName),
        this.metadatastore.relations.find(x => x.target === options.target && x.propertyName === options.propertyName)
      ].find(x => !_.isEmpty(x));

      if (!exists) {
        const properties = MetadataRegistry.$()
          .getByContextAndTarget(METATYPE_PROPERTY,
            options.target, 'merge', options.propertyName) as ITypeOrmPropertyOptions[];
        for (const property of properties) {
          this.create(METATYPE_PROPERTY, property);
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
    if (_.isString(fn)) {
      cName = this.findTable(table => _.isString(table.target) ? table.target === fn : table.target.name === fn);
    } else if (_.isFunction(fn)) {
      cName = this.findTable(table => table.target === fn);
    } else if (_.isPlainObject(fn)) {
      cName = this.findTable(table => table.target === fn.prototype.constructor);
    } else if (_.isObjectLike(fn)) {
      const construct = fn.prototype ? fn.prototype.constructor : fn.__proto__.constructor;
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
          _.assign(typeOrmOptions, options.metadata ? options.metadata : {});
          options.metadata = typeOrmOptions;
          this.metadatastore.tables.push(typeOrmOptions);
        }
      }
      const res = new TypeOrmEntityRef(options as ITypeOrmEntityOptions);
      this.register(res);
      return res as any;
    } else if (context === METATYPE_PROPERTY) {
      // remove cardinality is checked by property ref

      let tableType = 'column';
      const isArray = options.cardinality && options.cardinality !== 1;

      // correct type for typeorm
      let clsType: Function = options.type;
      if (_.isString(options.type)) {
        clsType = TypeOrmUtils.getJsObjectType(options.type);
        if (!clsType) {
          tableType = 'relation';
          const ref = ClassRef.find(options.type);
          if (ref) {
            clsType = ref.getClass();
          } else {
            clsType = ClassRef.get(options.type, this.namespace).getClass(true);
          }
        }
      } else if (isClassRef(clsType)) {
        tableType = 'relation';
        clsType = clsType.getClass();
      } else {
        tableType = 'relation';
        clsType = options.type;
      }


      tableType = _.get(options, 'tableType', tableType);
      const cardinality = options['cardinality'] ? options['cardinality'] : 1;
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
            _.defaults(typeOrmOptions, options.metadata);
          }

          update = true;
        }

        // correct type for typeorm
        let clsType: Function = options.type;
        if (_.isString(options.type)) {
          clsType = TypeOrmUtils.getJsObjectType(options.type);
          if (!clsType) {
            clsType = ClassRef.get(options.type, this.namespace).getClass(true);
          }
        } else if (isClassRef(clsType)) {
          clsType = clsType.getClass();
        }

        if (!typeOrmOptions.options) {
          typeOrmOptions.options = {};
        }
        typeOrmOptions.options.type = clsType;


        _.defaults(typeOrmOptions, {
          propertyName: options.propertyName,
          target: options.target
        });

        if (tableType === 'relation' && !typeOrmOptions.type) {
          typeOrmOptions.type = (type: any) => clsType;
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

            for (const x of _.keys(MAP_PROP_KEYS)) {
              if (_.has(options, x)) {
                _defaults.options[MAP_PROP_KEYS[x]] = options[x];
              }
            }
            _.defaultsDeep(typeOrmOptions, _defaults);
          } else if (tableType === 'relation') {
            _.defaultsDeep(typeOrmOptions, <RelationMetadataArgs>{
              type: () => clsType,
              isLazy: false,
              relationType: !isArray ? 'one-to-one' : 'one-to-many',
              options: {}
            });

          }
        }

        options.tableType = tableType;
        options.metadata = typeOrmOptions;

        if (update) {
          switch (tableType) {
            case 'column':
              this.metadatastore.columns.push(typeOrmOptions);
              break;
            case 'embedded':
              this.metadatastore.embeddeds.push(typeOrmOptions);
              break;
            case 'relation':
              this.metadatastore.relations.push(typeOrmOptions);
              break;
          }
        }
      }

      const propRef = new TypeOrmPropertyRef(options as ITypeOrmPropertyOptions);
      this.register(propRef);
      return propRef as any;
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
    const properties: TypeOrmPropertyRef[] = <TypeOrmPropertyRef[]>_.concat(
      _.map(this.metadatastore.columns
          .filter(c => c.target === fn.target),
        c => this.createPropertyByArgs('column', c)),
      _.map(this.metadatastore.filterRelations(fn.target),
        c => this.createPropertyByArgs('relation', c))
    );

    _.map(this.metadatastore.filterEmbeddeds(fn.target),
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
      return e.machineName === _.snakeCase(name);
    });
  }


  getEntityRefFor(instance: Object | string): TypeOrmEntityRef {
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

  fromJsonSchema(json: any) {
    return JsonSchema.unserialize(json, {
        namespace: this.namespace,
        collector: [
          {
            type: METATYPE_PROPERTY,
            key: 'type',
            fn: (key, data, options) => {
              const type = ['string', 'number', 'boolean', 'date', 'float', 'array', 'object'];
              if (type.includes(data[key])) {
                const cls = TypeOrmUtils.getJsObjectType(data[key]);
                if (cls === String) {
                  if (data['format'] === 'date' || data['format'] === 'date-time') {
                    return Date;
                  }
                }
                return cls;
              }
              return ClassRef.get(data[key], this.namespace).getClass(true);
            }
          }
        ]
      }
    );
  }

  add<T>(context: string, entry: T): T {
    return this.getLookupRegistry().add(context, entry);
  }


}
