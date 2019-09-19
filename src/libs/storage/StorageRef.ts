import {Log} from '../logging/Log';
import {TableMetadataArgs} from 'typeorm/metadata-args/TableMetadataArgs';
import {Connection, ConnectionOptions, EntityOptions, getConnectionManager, getMetadataArgsStorage} from 'typeorm';
import {ConnectionWrapper} from './ConnectionWrapper';
import {Config} from 'commons-config';

import {EntitySchema} from 'typeorm/entity-schema/EntitySchema';
import {K_WORKDIR} from '../Constants';
import {IStorageOptions} from './IStorageOptions';
import {SqliteConnectionOptions} from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import * as path from 'path';
import * as _ from 'lodash';
import {ClassUtils, PlatformUtils, TodoException} from 'commons-base';

import {AbstractSchemaHandler} from './AbstractSchemaHandler';
import {BaseUtils} from '../utils/BaseUtils';
import {StorageEntityController} from './StorageEntityController';
import {ClassRef, IClassRef, IEntityRef} from 'commons-schema-api';
import {REGISTRY_TYPEORM} from './framework/typeorm/schema/TypeOrmConstants';
import {TypeOrmEntityRegistry} from './framework/typeorm/schema/TypeOrmEntityRegistry';


export const DEFAULT_STORAGEREF_OPTIONS: IStorageOptions = <SqliteConnectionOptions & IStorageOptions>{
  connectOnStartup: false
};


export class StorageRef {

  // private static $$: Storage = null;

  constructor(options: IStorageOptions/* = DEFAULT_STORAGE_OPTIONS, FIX_STORAGE_OPTIONS: any = {}*/) {
    // Apply some unchangeable and fixed options
    // options = Utils.merge(options, FIX_STORAGE_OPTIONS);

    if (options.type ===  'sqlite') {
      const opts = <SqliteConnectionOptions & IStorageOptions>options;

      if (opts.database !== ':memory:' &&
        !_.isEmpty(opts.database) &&
        !path.isAbsolute(opts.database)) {
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

    this.options = _.assign({}, DEFAULT_STORAGEREF_OPTIONS, options);

    if (this.options.type ===  'sqlite') {
      this.singleConnection = true;
      if (this.options['database'] ===  ':memory:') {
        this.isMemoryOnly = true;
      }
    }

    let out = '';
    for (const x in this.options) {
      // todo define per config?
      if (['type', 'logging', 'database', 'dialect', 'synchronize', 'name'].indexOf(x) ===  -1) {
        continue;
      }
      if (_.isString(this.options[x])) {
        out += '\t' + x + ' = ' + this.options[x] + '\n';
      }
    }
    Log.debug(`storage: use ${this.options.type} for storage with options:\n${out} `);
    this.controller = new StorageEntityController(this);
  }

  get name() {
    return this.options.name;
  }

  get dbType(): string {
    return this.options.type;
  }


  // if memory then on connection must be permanent
  private singleConnection = false;

  private isMemoryOnly = false;

  private isInternalPooled = false;

  private connections: ConnectionWrapper[] = [];

  private options: IStorageOptions = null;

  // private entitySchemas: EntitySchema[] = [];

  private schemaHandler: AbstractSchemaHandler;

  private controller: StorageEntityController;

  private _forceReload = false;

  private _prepared = false;

  private static getClassName(x: string | EntitySchema | Function) {
    return ClassUtils.getClassName(x instanceof EntitySchema ? x.options.target : x);
  }

  private static machineName(x: string | EntitySchema | Function) {
    return _.snakeCase(this.getClassName(x));
  }

  isSingleConnection(): boolean {
    return this.singleConnection || this.isInternalPooled;
  }

  isOnlyMemory(): boolean {
    return this.isMemoryOnly;
  }

  addEntityClass(type: Function, name: string, options: EntityOptions = {}) {
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

  addEntityType(type: EntitySchema | Function): void {
    const opts: any = {
      entities: []
    };

    if (this.options.entities) {
      opts.entities = this.options.entities;
    }

    const exists = opts.entities.indexOf(type);

    if (exists < 0) {
      opts.entities.push(type);
      this.options = _.assign(this.options, opts);
    }
    if (this._prepared) {
      this._forceReload = true;
    }
  }


  getEntityRef(name: string | Function): IEntityRef {
    const clazz = this.getEntityClass(name);
    if (clazz) {
      return TypeOrmEntityRegistry.$().getEntityRefFor(clazz);
    }
    return null;
  }

  getClassRef(name: string | Function): IClassRef {
    const clazz = this.getEntityClass(name);
    if (clazz) {
      return ClassRef.get(clazz instanceof EntitySchema ? clazz.options.target : clazz, REGISTRY_TYPEORM);
    }
    return null;
  }


  hasEntityClass(ref: IClassRef | string | Function) {
    return !!this.getEntityClass(ref);
  }

  getEntityClass(ref: IClassRef | string | Function) {
    if (_.isString(ref)) {
      const _ref = _.snakeCase(ref);
      return this.options.entities.find(x => _ref === StorageRef.machineName(x));
    } else if (_.isFunction(ref)) {
      const _ref = ClassRef.get(ref, REGISTRY_TYPEORM);
      return this.options.entities.find(x => _ref.machineName === StorageRef.machineName(x));
    } else {
      return this.options.entities.find(x => (<IClassRef>ref).machineName ===  StorageRef.machineName(x));
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
      // let name = this.name
      await this.shutdown(full);
    }
    // return this.prepare()
  }


  async reload(full: boolean = true): Promise<any> {
    await this.reset(full);
    return this.prepare();
  }

  async prepare(): Promise<void> {
    if (!getConnectionManager().has(this.name)) {
      // todo maybe handle exception?

      let c = await getConnectionManager().create(<ConnectionOptions>this.options);
      c = await c.connect();
      await (await this.wrap(c)).close();
    } else {
      await (await this.wrap()).close();
    }
    this._prepared = true;
    // return Promise.resolve()
  }


  async wrap(conn ?: Connection): Promise<ConnectionWrapper> {
    let wrapper: ConnectionWrapper = null;
    if ((this.isSingleConnection() && this.connections.length ===  0) || !this.isSingleConnection()) {
      if (conn) {
        wrapper = new ConnectionWrapper(this, conn);
      } else {
        wrapper = new ConnectionWrapper(this);
      }
      this.connections.push(wrapper);
    } else if (this.isSingleConnection() && this.connections.length ===  1) {
      wrapper = this.connections[0];
    }
    return Promise.resolve(wrapper);
  }


  size() {
    return this.connections.length;
  }

  async remove(wrapper: ConnectionWrapper) {
    _.remove(this.connections, {inc: wrapper.inc});
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

  getOptions(): IStorageOptions {
    return this.options;
  }

  getController() {
    return this.controller;
  }


  async connect(): Promise<ConnectionWrapper> {
    if (this._forceReload) {
      this._forceReload = false;
      await this.reload();
    } else if (!this._prepared) {
      await this.prepare();
    }
    return (await this.wrap()).connect();
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

    if (full) {
      this.removeFromConnectionManager();
    }
  }

  async forceShutdown(): Promise<void> {
    await this.closeConnections();
    this.removeFromConnectionManager();
  }

}
