import {IStorageOptions} from '../../IStorageOptions';
import {SqliteConnectionOptions} from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import * as _ from 'lodash';
import {ClassUtils, PlatformUtils, TodoException} from 'commons-base';
import {Config} from 'commons-config';
import {K_WORKDIR} from '../../../Constants';
import {BaseUtils} from '../../../utils/BaseUtils';
import {Log} from '../../../logging/Log';
import {AbstractSchemaHandler} from '../../AbstractSchemaHandler';
import {EntitySchema} from 'typeorm/entity-schema/EntitySchema';
import {Connection, ConnectionOptions, EntityOptions, getConnectionManager, getMetadataArgsStorage} from 'typeorm';
import {TableMetadataArgs} from 'typeorm/metadata-args/TableMetadataArgs';
import {ClassType, IClassRef, IEntityRef} from 'commons-schema-api';
import {TypeOrmEntityRegistry} from './schema/TypeOrmEntityRegistry';
import {DEFAULT_STORAGEREF_OPTIONS} from '../../Constants';
import {classRefGet} from './Helper';
import {TypeOrmEntityController} from './TypeOrmEntityController';
import {TypeOrmConnectionWrapper} from './TypeOrmConnectionWrapper';
import {StorageRef} from '../../StorageRef';
import {ICollection} from '../../ICollection';
import {BaseConnectionOptions} from 'typeorm/connection/BaseConnectionOptions';
import {EVENT_STORAGE_ENTITY_ADDED, EVENT_STORAGE_REF_PREPARED, EVENT_STORAGE_REF_SHUTDOWN} from './Constants';


export class TypeOrmStorageRef extends StorageRef {

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
  //
  // private reloadTimout: NodeJS.Timeout;


  constructor(options: IStorageOptions & BaseConnectionOptions) {
    super(options);

    // Apply some unchangeable and fixed options
    // options = Utils.merge(options, FIX_STORAGE_OPTIONS);
    // super();
    // this.on('close', this.onCloseConnection.bind(this));
    if (options.type === 'sqlite') {
      const opts = <SqliteConnectionOptions & IStorageOptions>options;

      if (opts.database !== ':memory:' &&
        !_.isEmpty(opts.database) &&
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

    this.setOptions(_.assign({}, DEFAULT_STORAGEREF_OPTIONS, options));

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
      if (_.isString(this.getOptions()[x])) {
        out += '\t' + x + ' = ' + this.getOptions()[x] + '\n';
      }
    }
    Log.debug(`storage: use ${this.getOptions().type} for storage with options:\n${out} `);
    this.controller = new TypeOrmEntityController(this);

    // register used entities, TODO better way to register with annotation @Entity (from typeorm)
    if (_.has(this.getOptions(), 'entities') && _.isArray(this.getOptions().entities)) {
      this.getOptions().entities.map((type: any) => {
        this.registerEntityRef(type);
      });
    }

    // this.on(EVENT_STORAGE_ENTITY_ADDED, () => {
    //   clearTimeout(this.reloadTimout);
    //   this.reloadTimout = setTimeout(async () => {
    //     await this.reload();
    //   }, 0);
    // });
  }


  get dbType(): string {
    return this.getOptions().type;
  }


  private static getClassName(x: string | EntitySchema | Function) {
    return ClassUtils.getClassName(x instanceof EntitySchema ? x.options.target : x);
  }


  private static machineName(x: string | EntitySchema | Function) {
    return _.snakeCase(this.getClassName(x));
  }


  getFramework(): string {
    return 'typeorm';
  }


  getType(): string {
    return this.dbType;
  }


  registerEntityRef(type: string | Function | EntitySchema) {
    const entityRef = this.getEntityRef(type instanceof EntitySchema ? type.options.target : type);
    const cls = entityRef.getClassRef().getClass();
    const columns = getMetadataArgsStorage().filterColumns(cls);
    // convert unknown types

    // change unknown types to convert json
    columns.map(x => {
      if (_.isFunction(x.options.type)) {
        if (x.options.type.name === Object.name) {
          x.options.type = String;
          (<any>x.options).stringify = true;
        } else if (x.options.type.name === Array.name) {
          x.options.type = String;
          (<any>x.options).stringify = true;
        }
      }
    });

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
      _.remove(getMetadataArgsStorage().columns, x =>
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


  populateToExtended(type: EntitySchema | Function) {
    if (!_.isEmpty(this.getExtendedStorageRef())) {
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

    if (this.getOptions().entities) {
      opts.entities = this.getOptions().entities;
    }

    const exists = opts.entities.indexOf(type);
    if (exists < 0) {
      opts.entities.push(type);
      this.setOptions(_.assign(this.getOptions(), opts));
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


  getEntityRef(name: string | Function): IEntityRef {
    const clazz = this.getEntityClass(name);
    if (clazz) {
      return TypeOrmEntityRegistry.$().getEntityRefFor(clazz);
    }
    return null;
  }


  getEntityRefs(): IEntityRef[] {
    return this.getOptions().entities.map(x => this.getEntityRef(x));
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
      return classRefGet(clazz instanceof EntitySchema ? clazz.options.target : clazz);
    }
    return null;
  }


  hasEntityClass(ref: IClassRef | string | Function | ClassType<any>) {
    return !!this.getEntityClass(ref);
  }


  getEntityClass(ref: IClassRef | string | Function | ClassType<any>) {
    if (_.isString(ref)) {
      const _ref = _.snakeCase(ref);
      return this.getOptions().entities.find((x: any) => _ref === TypeOrmStorageRef.machineName(x));
    } else if (_.isFunction(ref)) {
      const _ref = classRefGet(ref);
      return this.getOptions().entities.find((x: any) => _ref.machineName === TypeOrmStorageRef.machineName(x));
    } else {
      return this.getOptions().entities.find((x: any) => (<IClassRef>ref).machineName === TypeOrmStorageRef.machineName(x));
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
    _.remove(this.connections, {inc: wrapper.inc});

  }


  async closeConnection() {
    if (_.isEmpty(this.connections) && !this.isOnlyMemory()) {
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
    return Promise.all(ps);
  }


  private removeFromConnectionManager() {
    const name = this.name;
    _.remove(getConnectionManager()['connections'], (connection) => {
      return connection.name === name;
    });
  }


  async shutdown(full: boolean = true): Promise<void> {
    if (!this.isOnlyMemory() || full) {
      await this.closeConnections();
    }
    await this.closeConnection();
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
