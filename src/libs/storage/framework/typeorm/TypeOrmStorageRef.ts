import {IStorageOptions} from '../../IStorageOptions';
import {SqliteConnectionOptions} from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import {assign, defaults, has, isArray, isEmpty, isFunction, isObjectLike, isString, remove, snakeCase} from 'lodash';
import {C_DEFAULT, ClassUtils, NotYetImplementedError, PlatformUtils, TodoException} from '@allgemein/base';
import {Config} from '@allgemein/config';
import {K_WORKDIR} from '../../../Constants';
import {BaseUtils} from '../../../utils/BaseUtils';
import {Log} from '../../../logging/Log';
import {AbstractSchemaHandler} from '../../AbstractSchemaHandler';
import {EntitySchema} from 'typeorm/entity-schema/EntitySchema';
import {Connection, ConnectionOptions, EntityOptions, getConnectionManager, getMetadataArgsStorage} from 'typeorm';
import {TableMetadataArgs} from 'typeorm/metadata-args/TableMetadataArgs';
import {ClassRef, ClassType, IClassRef, IEntityRef, IJsonSchema, RegistryFactory} from '@allgemein/schema-api';
import {DEFAULT_STORAGEREF_OPTIONS} from '../../Constants';
import {TypeOrmEntityController} from './TypeOrmEntityController';
import {TypeOrmConnectionWrapper} from './TypeOrmConnectionWrapper';
import {StorageRef} from '../../StorageRef';
import {ICollection} from '../../ICollection';
import {BaseConnectionOptions} from 'typeorm/connection/BaseConnectionOptions';
import {
  EVENT_STORAGE_ENTITY_ADDED,
  EVENT_STORAGE_REF_PREPARED,
  EVENT_STORAGE_REF_SHUTDOWN,
  REGISTRY_TYPEORM
} from './Constants';
import {ColumnMetadataArgs} from 'typeorm/metadata-args/ColumnMetadataArgs';
import {isEntityRef} from '@allgemein/schema-api/api/IEntityRef';
import {TypeOrmEntityRegistry} from './schema/TypeOrmEntityRegistry';


export class TypeOrmStorageRef extends StorageRef {

  // private reloadTimout: NodeJS.Timeout;
  get dbType(): string {
    return this.getOptions().type;
  }

  // if memory then on connection must be permanent
  private singleConnection = false;

  private isMemoryOnly = false;

  private isInternalPooled = false;

  private connections: TypeOrmConnectionWrapper[] = [];

  private schemaHandler: AbstractSchemaHandler;

  private controller: TypeOrmEntityController;

  private _forceReload = false;

  private _prepared = false;

  private _isActive = false;

  private namespace = REGISTRY_TYPEORM;


  constructor(options: IStorageOptions & BaseConnectionOptions) {
    super(defaults(options, {entities: []}));

    // Apply some unchangeable and fixed options
    // options = Utils.merge(options, FIX_STORAGE_OPTIONS);
    // super();
    // this.on('close', this.onCloseConnection.bind(this));
    if (options.type === 'sqlite') {
      const opts = <SqliteConnectionOptions & IStorageOptions>options;

      if (opts.database !== ':memory:' &&
        !isEmpty(opts.database) &&
        !PlatformUtils.isAbsolute(opts.database)) {
        // TODO check if file exists

        const possibleFiles = [];
        possibleFiles.push(PlatformUtils.pathResolveAndNormalize(opts.database));

        const _path = Config.get(K_WORKDIR, process.cwd()) + '/' + opts.database;
        possibleFiles.push(PlatformUtils.pathResolveAndNormalize(_path));

        let found = false;
        for (const test of possibleFiles) {
          if (PlatformUtils.fileExist(test) || PlatformUtils.fileExist(PlatformUtils.directory(test))) {
            options = BaseUtils.merge(options, {type: 'sqlite', database: test});
            found = true;
          }
        }

        if (!found) {
          throw new TodoException('File ' + opts.database + ' for database can\'t be found.');
        }
      }
    }

    this.setOptions(assign({}, DEFAULT_STORAGEREF_OPTIONS, options));

    if (this.getOptions().type === 'sqlite') {
      this.singleConnection = true;
      if (this.getOptions()['database'] === ':memory:') {
        this.isMemoryOnly = true;
      }
    }

    let out = '';
    for (const x in this.getOptions()) {
      // todo define per config?
      if (['type', 'logging', 'database', 'dialect', 'synchronize', 'name'].indexOf(x) === -1) {
        continue;
      }
      if (isString(this.getOptions()[x])) {
        out += '\t' + x + ' = ' + this.getOptions()[x] + '\n';
      }
    }
    Log.debug(`storage: use ${this.getOptions().type} for storage with options:\n${out} `);
    this.controller = new TypeOrmEntityController(this);


    // this.on(EVENT_STORAGE_ENTITY_ADDED, () => {
    //   clearTimeout(this.reloadTimout);
    //   this.reloadTimout = setTimeout(async () => {
    //     await this.reload();
    //   }, 0);
    // });
  }


  private static getClassName(x: string | EntitySchema | Function) {
    return ClassUtils.getClassName(x instanceof EntitySchema ? x.options.target : x);
  }


  private static machineName(x: string | EntitySchema | Function) {
    return snakeCase(this.getClassName(x));
  }

  async initialize(): Promise<boolean> {
    // register used entities, TODO better way to register with annotation @Entity (from typeorm)
    if (has(this.getOptions(), 'entities') && isArray(this.getDeclaredEntities())) {

      for (let i = 0; i < this.getDeclaredEntities().length; i++) {
        const type = this.getDeclaredEntities()[i];

        if (isObjectLike(type)) {
          if (has(type, '$schema')) {
            const SOURCE = type['__SOURCE__'];
            let cwd = process.cwd();
            if (SOURCE) {
              try {
                cwd = PlatformUtils.dirname(SOURCE);
              } catch (e) {
              }
            }
            // parse as json schema
            const entities = await (<IJsonSchema>this.getRegistry()).fromJsonSchema(type, {
              return: 'entity-refs',
              cwd: cwd
            });
            if (isArray(entities)) {
              const clazzes = [];
              for (const e of entities) {
                if (isEntityRef(e)) {
                  const clazz = e.getClassRef().getClass(true);
                  // replace with class representing the entity
                  this.registerEntityRef(e);
                  clazzes.push(clazz);
                }
              }
              this.getDeclaredEntities().splice(i, 1, ...clazzes);
            } else {
              throw new NotYetImplementedError('');
            }
          } else {
            throw new NotYetImplementedError('');
          }
        } else {
          // check if correctly annotated
          const entryExists = getMetadataArgsStorage().tables.find(x => x.target === type);
          if (!!entryExists) {
            this.registerEntityRef(type);
          }

        }
      }
    }
    return true;
  }


  getFramework(): string {
    return 'typeorm';
  }


  getType(): string {
    return this.dbType;
  }

  applyObjectToStringifiedJsonConversion(columns: ColumnMetadataArgs[]) {
    columns.map(x => {
      if (isFunction(x.options.type)) {
        if (x.options.type.name === Object.name) {
          x.options.type = String;
          (<any>x.options).stringify = true;
        } else if (x.options.type.name === Array.name) {
          x.options.type = String;
          (<any>x.options).stringify = true;
        }
      }
    });
  }


  registerEntityRef(type: string | Function | EntitySchema | IEntityRef) {
    let entityRef: IEntityRef = type as IEntityRef;
    if (!isEntityRef(type)) {
      entityRef = this.getEntityRef(type instanceof EntitySchema ? type.options.target : type);
    }

    // apply storage name as schema
    if (this.name !== C_DEFAULT) {
      (this.getRegistry() as TypeOrmEntityRegistry).addSchemaToEntityRef(this.name, entityRef, {
        override: true,
        onlyDefault: true
      });
    }

    const cls = entityRef.getClassRef().getClass();
    const columns = getMetadataArgsStorage().filterColumns(cls);
    // convert unknown types

    // change unknown types to convert json
    this.applyObjectToStringifiedJsonConversion(columns);

    if (this.dbType === 'mongodb') {
      /**
       * add _id as default objectId field if in entity declaration is only set PrimaryColumn
       */
      const idProps = entityRef.getPropertyRefs().filter(x => x.isIdentifier());
      const idNames = idProps.map(x => x.name);
      const found = columns.filter(x => x.mode === 'objectId' && idNames.includes(x.propertyName));
      if (found.length === 0 && !idNames.includes('_id')) {
        getMetadataArgsStorage().columns.push({
          mode: 'objectId',
          propertyName: '_id',
          target: cls,
          options: {primary: true, name: '_id'},
        });
      }

    } else {
      remove(getMetadataArgsStorage().columns, x =>
        x.target === cls && x.mode === 'objectId' && x.propertyName === '_id');
    }
  }


  isSingleConnection(): boolean {
    return this.singleConnection || this.isInternalPooled;
  }


  isOnlyMemory(): boolean {
    return this.isMemoryOnly;
  }


  addTableEntityClass(type: Function, name: string, options: EntityOptions = {}) {
    const args: TableMetadataArgs = {
      target: type,
      name: name.toLowerCase(),
      type: 'regular',
      orderBy: options && options.orderBy ? options.orderBy : undefined,
      engine: options && options.engine ? options.engine : undefined,
      database: options && options.database ? options.database : undefined,
      schema: options && options.schema ? options.schema : undefined,
      synchronize: options && options.synchronize ? options.synchronize : undefined
    };
    getMetadataArgsStorage().tables.push(args);
    this.addEntityType(type);
  }


  private populateToExtended(type: EntitySchema | Function) {
    if (!isEmpty(this.getExtendedStorageRef())) {
      for (const ref of this.getExtendedStorageRef() as TypeOrmStorageRef[]) {
        ref.addEntityType(type);
      }
    }
  }

  /**
   *
   * @param type
   * @param options
   */
  addEntityClass(type: Function | IClassRef | ClassType<any>, options?: any): void {
    this.addEntityType(type as any);
  }


  /**
   * Add entity class
   *
   * @param type
   */
  addEntityType(type: EntitySchema | Function): void {
    const opts: any = {
      entities: []
    };

    if (this.getDeclaredEntities()) {
      opts.entities = this.getDeclaredEntities();
    }

    const exists = opts.entities.indexOf(type);
    if (exists < 0) {
      opts.entities.push(type);
      this.setOptions(assign(this.getOptions(), opts));
      // NOTE create an class ref entry to register class usage in registry
      this.registerEntityRef(type);
    }

    if (this._prepared) {
      this._prepared = false;
      this.removeFromConnectionManager();
    }

    this.populateToExtended(type);
    this.emit(EVENT_STORAGE_ENTITY_ADDED, type);
  }

  getDeclaredEntities() {
    return this.getOptions().entities;
  }


  getEntityRef(name: string | Function): IEntityRef {
    const clazz = this.getEntityClass(name);
    if (clazz) {
      return this.getRegistry().getEntityRefFor(clazz);
    }
    return null;
  }

  getRegistry() {
    return RegistryFactory.get(REGISTRY_TYPEORM);
  }


  getEntityRefs(): IEntityRef[] {
    return this.getDeclaredEntities()
      .map(x => this.getEntityRef(x))
      .filter(x => x && isEntityRef(x));
  }


  getEntityNames(): string[] {
    return this.getEntityRefs().map(x => x.name);
  }


  async getRawCollectionNames(): Promise<string[]> {
    return this.getSchemaHandler().getCollectionNames();
  }


  async getRawCollections(collectionNames: string[]): Promise<ICollection[]> {
    return this.getSchemaHandler().getCollections(collectionNames);
  }


  async getRawCollection(name: string): Promise<ICollection> {
    const list = await this.getSchemaHandler().getCollections([name]);
    return list.find(x => x.name === name);
  }


  getClassRef(name: string | Function): IClassRef {
    const clazz = this.getEntityClass(name);
    if (clazz) {
      return ClassRef.get(clazz instanceof EntitySchema ? clazz.options.target : clazz, this.namespace);
    }
    return null;
  }


  hasEntityClass(ref: IClassRef | string | Function | ClassType<any>) {
    return !!this.getEntityClass(ref);
  }


  getEntityClass(ref: IClassRef | string | Function | ClassType<any>) {
    if (isString(ref)) {
      const _ref = snakeCase(ref);
      return this.getDeclaredEntities().find((x: any) => _ref === TypeOrmStorageRef.machineName(x));
    } else if (isFunction(ref)) {
      const _ref = ClassRef.get(ref, this.namespace);
      return this.getDeclaredEntities().find((x: any) => _ref.machineName === TypeOrmStorageRef.machineName(x));
    } else {
      return this.getDeclaredEntities().find((x: any) => (<IClassRef>ref).machineName === TypeOrmStorageRef.machineName(x));
    }
  }


  getSchemaHandler() {
    return this.schemaHandler;
  }

  setSchemaHandler(handler: AbstractSchemaHandler) {
    this.schemaHandler = handler;
  }

  async reset(full: boolean = true): Promise<any> {
    this._prepared = false;
    if (getConnectionManager().has(this.name)) {
      await this.shutdown(full);
    }
  }


  getOptions(): IStorageOptions & BaseConnectionOptions {
    return super.getOptions() as IStorageOptions & BaseConnectionOptions;
  }


  async reload(full: boolean = true): Promise<boolean> {
    await this.reset(full);
    return this.prepare();
  }


  async prepare(): Promise<boolean> {
    if (!getConnectionManager().has(this.name)) {
      // todo maybe handle exception?
      this._isActive = true;
      let c = this.getConnection();
      c = await c.connect();
      await this.wrap(c).close();
    } else {
      await this.wrap().close();
    }
    this._prepared = true;
    this.emit(EVENT_STORAGE_REF_PREPARED);
    return Promise.resolve(this._prepared);
  }

  isActive() {
    return this._isActive;
  }

  /**
   * Return typeorm connection object
   */
  getConnection() {
    if (!getConnectionManager().has(this.name)) {
      return getConnectionManager().create(<ConnectionOptions>this.getOptions());
    } else {
      return getConnectionManager().get(this.name);
    }
  }


  wrap(conn ?: Connection): TypeOrmConnectionWrapper {
    let wrapper: TypeOrmConnectionWrapper = null;
    if ((this.isSingleConnection() && this.connections.length === 0) || !this.isSingleConnection()) {
      if (conn) {
        wrapper = new TypeOrmConnectionWrapper(this, conn);
      } else {
        wrapper = new TypeOrmConnectionWrapper(this);
      }
      wrapper.initialize();
      this.connections.push(wrapper);
    } else if (this.isSingleConnection() && this.connections.length === 1) {
      wrapper = this.connections[0];
    }
    return wrapper;
  }


  size() {
    return this.connections.length;
  }


  async remove(wrapper: TypeOrmConnectionWrapper) {
    remove(this.connections, {inc: wrapper.inc});

  }


  async closeConnection() {
    if (isEmpty(this.connections) && !this.isOnlyMemory()) {
      if (getConnectionManager().has(this.name) && getConnectionManager().get(this.name).isConnected) {
        try {
          await getConnectionManager().get(this.name).close();
        } catch (err) {
          Log.error(err);
        }
      }
    }
  }


  getController() {
    return this.controller;
  }


  async connect(): Promise<TypeOrmConnectionWrapper> {
    if (this._forceReload) {
      this._forceReload = false;
      await this.reload();
    } else if (!this._prepared) {
      await this.prepare();
    }
    return this.wrap().connect();
  }


  private async closeConnections(): Promise<any> {
    const ps: Promise<any> [] = [];
    while (this.connections.length > 0) {
      ps.push(this.connections.shift().close());
    }
    return Promise.all(ps).catch(x => {
    });
  }


  private removeFromConnectionManager() {
    const name = this.name;
    remove(getConnectionManager()['connections'], (connection) => {
      return connection.name === name;
    });
  }


  async shutdown(full: boolean = true): Promise<void> {
    if (!this.isOnlyMemory() || full) {
      await this.closeConnections();
    }
    try {
      await this.closeConnection();
    } catch (e) {
    }

    if (full) {
      this.removeFromConnectionManager();
      this.emit(EVENT_STORAGE_REF_SHUTDOWN);
      this.removeAllListeners();
    }
  }


  async forceShutdown(): Promise<void> {
    await this.closeConnections();
    await this.closeConnection();
    this.removeFromConnectionManager();
    this.removeAllListeners();
  }

}
