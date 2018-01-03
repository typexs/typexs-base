import * as path from "path";
import * as _ from "lodash";
import {Connection, ConnectionOptions, EntityOptions, getConnectionManager, getMetadataArgsStorage} from "typeorm";
import {IStorageOptions} from "./IStorageOptions";


import {Config} from "commons-config";
import {K_WORKDIR} from "../types";
import {Utils} from "../utils/Utils";
import {ConnectionWrapper} from "./ConnectionWrapper";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";


import {Runtime} from "../Runtime";
import {PlatformUtils} from "../utils/PlatformUtils";
import TodoException from "../exceptions/TodoException";
import {Log} from "../logging/Log";
import {EntitySchema} from "typeorm/entity-schema/EntitySchema";
import {TableMetadataArgs} from "typeorm/metadata-args/TableMetadataArgs";


export const DEFAULT_STORAGE_OPTIONS: IStorageOptions = <SqliteConnectionOptions>{
  name: 'default',
  type: "sqlite",
  database: ":memory:"
  //tablesPrefix: "npb_"

};


export class Storage {

  private _name: string = null;

  // if memory then on connection must be permanent
  private singleConnection: boolean = false;

  private isMemoryOnly: boolean = false;

  private isInternalPooled: boolean = false;

  private connections: ConnectionWrapper[] = [];

  private options: IStorageOptions = null;

  private entitySchemas: EntitySchema[] = [];

  private static $$: Storage = null;

  constructor(options: IStorageOptions = DEFAULT_STORAGE_OPTIONS, FIX_STORAGE_OPTIONS: any = {}) {
    // Apply some unchangeable and fixed options
    options = Utils.merge(options, FIX_STORAGE_OPTIONS);

    if (options.type == 'sqlite') {
      let opts = <SqliteConnectionOptions>options;
      if (opts.database != ':memory:' &&
        !_.isEmpty(opts.database) &&
        !path.isAbsolute(opts.database)) {
        // TODO check if file exists

        let possibleFiles = [];
        possibleFiles.push(PlatformUtils.pathResolveAndNormalize(opts.database));

        let _path = Config.get(K_WORKDIR, process.cwd()) + '/' + opts.database;
        possibleFiles.push(PlatformUtils.pathResolveAndNormalize(_path));

        let found = false;
        for (let test of possibleFiles) {
          if (PlatformUtils.fileExist(test) || PlatformUtils.fileExist(PlatformUtils.directory(test))) {
            options = Utils.merge(options, {type: 'sqlite', database: test});
            found = true
          }
        }

        if (!found) {
          throw new TodoException('File ' + opts.database + ' for database can\'t be found.')
        }

      }
    }

    this.options = Object.assign({}, DEFAULT_STORAGE_OPTIONS, options);
    this._name = this.options.name;

    if (this.options.type == 'sqlite') {
      this.singleConnection = true;
      if (this.options['database'] == ':memory:') {
        this.isMemoryOnly = true;
      }
    }

    let out = "";
    for (let x in this.options) {
      if (typeof this.options[x] === 'string') {
        out += "\t" + x + " = " + this.options[x] + "\n"
      }
    }
    Log.info(`storage: use ${this.options.type} for storage with options:\n${out} `);
    Runtime.$().setConfig('storage', this.options)
  }

  get name() {
    return this._name
  }

  get dbType() {
    return this.options.type
  }

  isSingleConnection(): boolean {
    return this.singleConnection || this.isInternalPooled
  }

  isOnlyMemory(): boolean {
    return this.isMemoryOnly
  }

  addEntityClass(type: Function, name: string, options: EntityOptions = {}) {
    const args: TableMetadataArgs = {
      target: type,
      name: name.toLocaleLowerCase(),
      type: "regular",
      orderBy: options && options.orderBy ? options.orderBy : undefined,
      engine: options && options.engine ? options.engine : undefined,
      skipSync: !!(options && options.skipSync === true)
    };
    getMetadataArgsStorage().tables.push(args);
    this.addEntityType(type);
  }

  addEntityType(type: EntitySchema | Function): void {
    let opts: any = {
      entitySchemas: [],
      entities: []
    };
    if (this.options.entitySchemas) {
      opts.entitySchemas = this.options.entitySchemas
    }
    if (this.options.entities) {
      opts.entities = this.options.entities;
    }

    if (_.isFunction(type)) {
      let exists = opts.entities.indexOf(type);

      if (exists < 0) {
        opts.entities.push(type);
        this.options = _.assign(this.options, opts)
      }
    } else {
      let exists = _.find(opts.entitySchemas, {name: type.name});
      if (!exists) {
        opts.entitySchemas.push(type);
        this.options = _.assign(this.options, opts)
      }
    }
  }

  async reload(full: boolean = true): Promise<any> {
    if (getConnectionManager().has(this.name)) {
      // let name = this.name
      await this.shutdown(full)
    }
    return this.prepare()
  }

  async prepare(): Promise<void> {
    if (!getConnectionManager().has(this.name)) {
      let c = await  getConnectionManager().create(<ConnectionOptions>this.options);
      c = await c.connect();
      await(await this.wrap(c)).close();
    }
    else {
      await(await this.wrap()).close()
    }
    // return Promise.resolve()
  }


  async wrap(conn ?: Connection): Promise<ConnectionWrapper> {
    let wrapper: ConnectionWrapper = null;
    if ((this.isSingleConnection() && this.connections.length == 0) || !this.isSingleConnection()) {
      if (conn) {
        wrapper = new ConnectionWrapper(this, conn)
      } else {
        wrapper = new ConnectionWrapper(this)
      }
      this.connections.push(wrapper)
    } else if (this.isSingleConnection() && this.connections.length == 1) {
      wrapper = this.connections[0]
    }
    return Promise.resolve(wrapper)
  }


  size() {
    return this.connections.length
  }

  async remove(wrapper: ConnectionWrapper) {
    _.remove(this.connections, {inc: wrapper.inc});
    if (_.isEmpty(this.connections)) {
      try {
        await getConnectionManager().get(this.name).close()
      } catch (err) {
      }
    }
  }


  async connect(): Promise<ConnectionWrapper> {
    return (await this.wrap()).connect()
  }


  private async closeConnections(): Promise<any> {
    let ps: Promise<any> [] = [];
    while (this.connections.length > 0) {
      ps.push(this.connections.shift().close(true));
    }
    return Promise.all(ps)
  }


  private removeFromConnectionManager() {
    let name = this.name;
    _.remove(getConnectionManager()['connections'], (connection) => {
      return connection.name === name;
    });
  }


  async shutdown(full: boolean = true): Promise<void> {
    //let name = this.name
    Log.debug('storage shutdown');

    if (!this.isOnlyMemory()) {
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
