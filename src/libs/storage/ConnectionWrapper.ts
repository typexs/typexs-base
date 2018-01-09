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

  connection: Connection;

  constructor(s: StorageRef, conn?: Connection) {
    this.storage = s;
    this.connection = conn;
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
      if (!this.connection) {
        this.connection = await getConnectionManager().get(this.name);
      }

      if (!this.connection.isConnected) {
        this.connection = await this.connection.connect()
      }
    } catch (err) {
      Log.error(err);
    } finally {
      ConnectionWrapper._LOCK.ready();
    }
    return Promise.resolve(this)
  }


  get manager(): EntityManager {
    return this.connection.manager
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

}
