import * as _ from 'lodash';

import {TypeOrmEntityRef} from './TypeOrmEntityRef';
import {TableMetadataArgs} from 'typeorm/browser/metadata-args/TableMetadataArgs';

import {
  AbstractRef,
  Binding,
  ClassRef,
  IEntityRef,
  IEntityRefMetadata,
  ILookupRegistry,
  IPropertyRef,
  LookupRegistry,
  SchemaUtils,
  XS_TYPE,
  XS_TYPE_ENTITY,
  XS_TYPE_PROPERTY
} from 'commons-schema-api/browser';
import {REGISTRY_TYPEORM} from './TypeOrmConstants';
import {ClassUtils, NotYetImplementedError} from '@allgemein/base/browser';
import {TypeOrmPropertyRef} from './TypeOrmPropertyRef';
import {RelationMetadataArgs} from 'typeorm/browser/metadata-args/RelationMetadataArgs';
import {ColumnMetadataArgs} from 'typeorm/browser/metadata-args/ColumnMetadataArgs';
import {getMetadataStorage} from 'class-validator';
import {MetadataArgsStorage} from 'typeorm/browser/metadata-args/MetadataArgsStorage';
import {ValidationMetadata} from '../../../../class-validator/ValidationMetadata';
import {classRefGet} from '../Helper';
import {EventEmitter} from 'events';
import {EmbeddedMetadataArgs} from 'typeorm/browser/metadata-args/EmbeddedMetadataArgs';

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

export class TypeOrmEntityRegistry extends EventEmitter implements ILookupRegistry {

  constructor() {
    super();
    this.setMaxListeners(1000);

    this.lookupRegistry = LookupRegistry.$(REGISTRY_TYPEORM);
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

  private lookupRegistry: LookupRegistry;

  private metadatastore: MetadataArgsStorage = null;

  static $() {
    if (!this._self) {
      this._self = new TypeOrmEntityRegistry();
    }
    return this._self;
  }


  static reset() {
    const self = this.$();
    self.reset();
    this._self = null;
    LookupRegistry.reset(REGISTRY_TYPEORM);
  }

  reset() {
    this.removeAllListeners();
    for (const key of typeormMetadataKeys) {
      delete this.metadatastore[key]['__txs'];
      this.metadatastore[key].push = Array.prototype.push.bind(this.metadatastore[key]);
      this.metadatastore[key].splice = Array.prototype.splice.bind(this.metadatastore[key]);
    }
    this.lookupRegistry = null;
  }

  onMetaDataPush(key: TYPEORM_METADATA_KEYS, ...args: any[]) {
    let foundEntity = null;
    switch (key) {
      case 'columns':
        const columnMetadata = args[0] as ColumnMetadataArgs;
        if (columnMetadata.target) {
          foundEntity = this.find(columnMetadata.target);
        }
        if (foundEntity) {
          const exists = foundEntity.getPropertyRefs()
            .find(x => x.storingName === columnMetadata.propertyName && x.getClass() === columnMetadata.target);
          if (!exists) {
            this.createPropertyByArgs('column', columnMetadata, true);
          }
        }
        break;
      case 'embeddeds':
        const embedded = args[0] as EmbeddedMetadataArgs;

        if (embedded.target) {
          foundEntity = this.find(embedded.target);
        }
        if (foundEntity) {
          const exists = foundEntity.getPropertyRefs()
            .find(x => x.storingName === embedded.propertyName && x.getClass() === embedded.target);
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


  register(xsdef: AbstractRef | Binding): AbstractRef | Binding {
    if (xsdef instanceof TypeOrmEntityRef) {
      return this.lookupRegistry.add(XS_TYPE_ENTITY, xsdef);
    } else if (xsdef instanceof TypeOrmPropertyRef) {
      return this.lookupRegistry.add(XS_TYPE_PROPERTY, xsdef);
    } else if (xsdef instanceof Binding) {
      return this.lookupRegistry.add(xsdef.bindingType, xsdef);
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


  createPropertyByArgs(type: 'column' | 'relation' | 'embedded',
                       args: ColumnMetadataArgs | RelationMetadataArgs | EmbeddedMetadataArgs,
                       recursive: boolean = false) {
    const propRef = new TypeOrmPropertyRef(args, type);
    this.register(propRef);
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
    const entity = new TypeOrmEntityRef(fn);
    this.register(entity);

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
      if (!classRef.getEntityRef()) {
        const metadata = this._findTableMetadataArgs(classRef.getClass());
        if (metadata) {
          this.createEntity(metadata);
        }
      }
    });
    return entity;
  }


  private find(instance: any): TypeOrmEntityRef {
    const cName = ClassUtils.getClassName(instance);
    return this.getEntityRefByName(cName);
  }


  getEntityRefByName(name: string): TypeOrmEntityRef {
    return this.lookupRegistry.find(XS_TYPE_ENTITY, (e: TypeOrmEntityRef) => {
      return e.machineName === _.snakeCase(name);
    });
  }


  getEntityRefFor(instance: Object | string): TypeOrmEntityRef {
    if (!instance) {
      return null;
    }
    const entityRef = this.find(instance);
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
    return this.lookupRegistry.list(XS_TYPE_ENTITY) as TypeOrmEntityRef[];
  }


  getPropertyRefsFor(entity: IEntityRef | ClassRef): TypeOrmPropertyRef[] {
    if (entity instanceof TypeOrmEntityRef) {
      return this.lookupRegistry.filter(XS_TYPE_PROPERTY, (x: TypeOrmPropertyRef) => x.getSourceRef().id() === entity.getClassRef().id());
    } else {
      return this.lookupRegistry.filter(XS_TYPE_PROPERTY, (x: TypeOrmPropertyRef) => {
        return x.getSourceRef().id() === entity.id();
      });
    }
  }


  fromJson(orgJson: IEntityRefMetadata): IEntityRef {
    const json = _.cloneDeep(orgJson);
    let classRef = ClassRef.find(json.name, REGISTRY_TYPEORM);
    if (!classRef) {
      classRef = classRefGet(SchemaUtils.clazz(json.name));
    }
    classRef.setSchema(json.schema);

    const tableMetaData: TableMetadataArgs = json.options;
    let entityRef = this.find(json.name);
    if (!entityRef) {
      tableMetaData.target = classRef.getClass();
      entityRef = new TypeOrmEntityRef(tableMetaData);
      this.register(entityRef);
    }

    if (entityRef) {
      for (const prop of json.properties) {
        const exists = entityRef.getPropertyRef(prop.name);
        if (exists) {
          continue;
        }
        let targetRef = null;
        const propType = _.get(prop, 'ormPropertyType', false);
        if (propType === 'relation') {
          targetRef = classRefGet(prop.targetRef.className);
          targetRef.setSchema(prop.targetRef.schema);
          const r: RelationMetadataArgs = prop.options;
          (<any>r).target = classRef.getClass();
          (<any>r).type = targetRef.getClass();
          const p = new TypeOrmPropertyRef(r, 'relation');
          this.register(p);
        } else if (propType === 'embedded') {
          targetRef = classRefGet(prop.targetRef.className);
          targetRef.setSchema(prop.targetRef.schema);
          const r: RelationMetadataArgs = prop.options;
          (<any>r).target = classRef.getClass();
          (<any>r).type = targetRef.getClass();
          const p = new TypeOrmPropertyRef(r, 'embedded');
          this.register(p);
        } else {
          const c: ColumnMetadataArgs = prop.options;
          (<any>c).target = classRef.getClass();

          let type: any = prop.options.type;
          switch (prop.dataType) {
            case 'Number':
              type = Number;
              break;
            case 'String':
              type = String;
              break;
            case 'Boolean':
              type = Boolean;
              break;
            case 'Symbol':
              type = Symbol;
              break;
            case 'Date':
              type = Date;
              break;

          }

          if (!type && prop.dataType) {
            type = prop.dataType;
          }

          (<any>c).options.type = type;

          const p = new TypeOrmPropertyRef(c, 'column');
          this.register(p);

        }
        if (prop.validator) {
          prop.validator.forEach(m => {
            const _m = _.clone(m);
            _m.target = classRef.getClass();
            const vma = new ValidationMetadata(_m);
            getMetadataStorage().addValidationMetadata(vma as any);
          });
        }
      }
    }

    return entityRef;
  }

  list<T>(type: XS_TYPE, filter?: (x: any) => boolean): T[] {
    return this.lookupRegistry.filter(type, filter);
  }


  listEntities(fn?: (x: IEntityRef) => boolean): TypeOrmEntityRef[] {
    return this.lookupRegistry.filter(XS_TYPE_ENTITY, fn);
  }


  listProperties(fn?: (x: IPropertyRef) => boolean): TypeOrmPropertyRef[] {
    return this.lookupRegistry.filter(XS_TYPE_PROPERTY, fn);
  }

}
