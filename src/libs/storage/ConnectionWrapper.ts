import {Connection, EntityManager, getConnectionManager} from "typeorm";
import {Log} from "../logging/Log";
import {Progress} from "../Progress";
import {StorageRef} from "./StorageRef";

export class ConnectionWrapper {

  static $INC: number = 0;

  inc: number = ConnectionWrapper.$INC++;

  private name: string = null;

  private static _LOCK = new Progress();

  storage: StorageRef;

  _connection: Connection;

  constructor(s: StorageRef, conn?: Connection) {
    this.storage = s;
    this._connection = conn;
    this.name = this.storage.name
  }


  /**
   * Persists (saves) all given entities in the database.
   * If entities do not exist in the database then inserts, otherwise updates.
   *
   * @deprecated
   */
  async persist<Entity>(o: Entity): Promise<any> {
    return this.manager.save(o)
  }

  async save<Entity>(o: Entity): Promise<any> {
    try {
      return this.manager.save(o)
    } catch (err) {
      Log.error(err);
      throw err
    }
  }


  isSingleConnection(): boolean {
    return this.storage.isSingleConnection()
  }

  isOnlyMemory(): boolean {
    return this.storage.isOnlyMemory()
  }

  async connect(): Promise<ConnectionWrapper> {
    await ConnectionWrapper._LOCK.startWhenReady();
    try {
      if (!this._connection) {
        this._connection = await getConnectionManager().get(this.name);
      }

      if (!this._connection.isConnected) {
        this._connection = await this._connection.connect()
      }
    } catch (err) {
      Log.error(err);
    } finally {
      ConnectionWrapper._LOCK.ready();
    }
    return Promise.resolve(this)
  }


  get manager(): EntityManager {
    return this._connection.manager
  }

  async close(): Promise<ConnectionWrapper> {
    await ConnectionWrapper._LOCK.startWhenReady();
    try {
      await this.storage.remove(this);
    } catch (err) {
      Log.error(err);
    } finally {
      ConnectionWrapper._LOCK.ready();
    }
    return Promise.resolve(this)
  }

  get connection() {
    return this._connection;
  }

}
