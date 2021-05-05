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
  METATYPE_ENTITY,
  METATYPE_PROPERTY,
  RegistryFactory,
} from '@allgemein/schema-api';
import {REGISTRY_TYPEORM} from './TypeOrmConstants';
import {ClassUtils, NotSupportedError, NotYetImplementedError} from '@allgemein/base';
import {ITypeOrmPropertyOptions, TypeOrmPropertyRef} from './TypeOrmPropertyRef';
import {RelationMetadataArgs} from 'typeorm/browser/metadata-args/RelationMetadataArgs';
import {ColumnMetadataArgs} from 'typeorm/browser/metadata-args/ColumnMetadataArgs';
import {MetadataArgsStorage} from 'typeorm/browser/metadata-args/MetadataArgsStorage';
import {EmbeddedMetadataArgs} from 'typeorm/browser/metadata-args/EmbeddedMetadataArgs';
import {TypeOrmUtils} from '../TypeOrmUtils';
import {isClassRef} from '@allgemein/schema-api/api/IClassRef';


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

export class TypeOrmEntityRegistry extends DefaultNamespacedRegistry/*AbstractRegistry /*EventEmitter implements ILookupRegistry*/ {

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


  private static _self: TypeOrmEntityRegistry;

  private metadatastore: MetadataArgsStorage = null;

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
    // console.log('');
    // // super.onAdd(context, options);
    // if (context === METATYPE_ENTITY) {
    //   // check if metadata exists for the entry
    //   const exists = this.metadatastore.tables.find(x => x.target === options.target);
    //   if (!exists) {
    //     // this.metadatastore.tables.push(<TableMetadataArgs>{
    //     //   target: options.target,
    //     //   type: 'regular'
    //     // });
    //   }
    // } else if (context === METATYPE_PROPERTY) {
    //   console.log('');
    // }
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
      case 'tables':
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
            target: options.target
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
      delete options['cardinality'];
      const tableType = _.get(options, 'tableType', 'column');
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


  // fromJson(orgJson: IEntityRefMetadata): IEntityRef {
  //   const json = _.cloneDeep(orgJson);
  //   let classRef = ClassRef.find(json.name, REGISTRY_TYPEORM);
  //   if (!classRef) {
  //     classRef = classRefGet(SchemaUtils.clazz(json.name));
  //   }
  //   classRef.setSchema(json.schema);
  //
  //   const tableMetaData: TableMetadataArgs = json.options;
  //   let entityRef = this.find(json.name);
  //   if (!entityRef) {
  //     tableMetaData.target = classRef.getClass();
  //     entityRef = new TypeOrmEntityRef(tableMetaData);
  //     this.register(entityRef);
  //   }
  //
  //   if (entityRef) {
  //     for (const prop of json.properties) {
  //       const exists = entityRef.getPropertyRef(prop.name);
  //       if (exists) {
  //         continue;
  //       }
  //       let targetRef = null;
  //       const propType = _.get(prop, 'ormtype', false);
  //       if (propType === 'relation') {
  //         targetRef = classRefGet(prop.targetRef.className);
  //         targetRef.setSchema(prop.targetRef.schema);
  //         const r: RelationMetadataArgs = prop.options;
  //         (<any>r).target = classRef.getClass();
  //         (<any>r).type = targetRef.getClass();
  //         const p = new TypeOrmPropertyRef(r, 'relation');
  //         this.register(p);
  //       } else if (propType === 'embedded') {
  //         targetRef = classRefGet(prop.targetRef.className);
  //         targetRef.setSchema(prop.targetRef.schema);
  //         const r: RelationMetadataArgs = prop.options;
  //         (<any>r).target = classRef.getClass();
  //         (<any>r).type = targetRef.getClass();
  //         const p = new TypeOrmPropertyRef(r, 'embedded');
  //         this.register(p);
  //       } else {
  //         const c: ColumnMetadataArgs = prop.options;
  //         (<any>c).target = classRef.getClass();
  //
  //         let type: any = prop.options.type;
  //         switch (prop.dataType) {
  //           case 'Number':
  //             type = Number;
  //             break;
  //           case 'String':
  //             type = String;
  //             break;
  //           case 'Boolean':
  //             type = Boolean;
  //             break;
  //           case 'Symbol':
  //             type = Symbol;
  //             break;
  //           case 'Date':
  //             type = Date;
  //             break;
  //
  //         }
  //
  //         if (!type && prop.dataType) {
  //           type = prop.dataType;
  //         }
  //
  //         (<any>c).options.type = type;
  //
  //         const p = new TypeOrmPropertyRef(c, 'column');
  //         this.register(p);
  //
  //       }
  //       if (prop.validator) {
  //         prop.validator.forEach(m => {
  //           const _m = _.clone(m);
  //           _m.target = classRef.getClass();
  //           const vma = new ValidationMetadata(_m);
  //           getMetadataStorage().addValidationMetadata(vma as any);
  //         });
  //       }
  //     }
  //   }
  //
  //   return entityRef;
  // }

  // list<T>(type: METADATA_TYPE, filter?: (x: any) => boolean): T[] {
  //   return this.filter(type, filter);
  // }


  // listEntities(fn?: (x: IEntityRef) => boolean): TypeOrmEntityRef[] {
  //   return this.lookupRegistry.filter(METATYPE_ENTITY, fn);
  // }
  //
  //
  // listProperties(fn?: (x: IPropertyRef) => boolean): TypeOrmPropertyRef[] {
  //   return this.lookupRegistry.filter(METATYPE_PROPERTY, fn);
  // }
  //
  // add<T>(context: string, entry: T): T {
  //   return undefined;
  // }
  //
  // create<T>(context: string, options: any): T {
  //   return undefined;
  // }
  //
  // filter<T>(context: string, search: any): T[] {
  //   return [];
  // }
  //
  // find<T>(context: string, search: any): T {
  //   return undefined;
  // }
  //
  // getEntities(filter?: (x: IEntityRef) => boolean): IEntityRef[] {
  //   return [];
  // }
  //
  // getLookupRegistry(): LookupRegistry {
  //   return undefined;
  // }
  //
  // getPropertyRef(ref: IClassRef | IEntityRef, name: string): IPropertyRef {
  //   return undefined;
  // }
  //
  // getPropertyRefs(ref: IClassRef | IEntityRef): IPropertyRef[] {
  //   return [];
  // }
  //
  // getSchemaRefs(filter?: (x: ISchemaRef) => boolean): ISchemaRef[] {
  //   return [];
  // }
  //
  // getSchemaRefsFor(ref: IEntityRef): ISchemaRef[] {
  //   return [];
  // }
  //
  // remove<T>(context: string, search: any): T[] {
  //   return [];
  // }

}
