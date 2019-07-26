import {Connection, EntityManager, getConnectionManager} from 'typeorm';
import {Log} from '../logging/Log';
import {StorageRef} from './StorageRef';
import {Semaphore} from '../Semaphore';

export class ConnectionWrapper {

  constructor(s: StorageRef, conn?: Connection) {
    this.storage = s;
    this._connection = conn;
    this.name = this.storage.name;
  }


  get manager(): EntityManager {
    return this._connection.manager;
  }

  get connection() {
    return this._connection;
  }

  static $INC = 0;

  private static _LOCK = new Semaphore(1);

  inc: number = ConnectionWrapper.$INC++;

  private name: string = null;

  storage: StorageRef;

  _connection: Connection;


  /**
   * Persists (saves) all given entities in the database.
   * If entities do not exist in the database then inserts, otherwise updates.
   *
   * @deprecated
   */
  async persist<Entity>(o: Entity): Promise<any> {
    return this.manager.save(o);
  }

  async save<Entity>(o: Entity): Promise<any> {
    try {
      return this.manager.save(o);
    } catch (err) {
      Log.error(err);
      throw err;
    }
  }


  isSingleConnection(): boolean {
    return this.storage.isSingleConnection();
  }

  isOnlyMemory(): boolean {
    return this.storage.isOnlyMemory();
  }

  async connect(): Promise<ConnectionWrapper> {
    await ConnectionWrapper._LOCK.acquire();
    try {
      if (!this._connection) {
        this._connection = await getConnectionManager().get(this.name);
      }

      if (!this._connection.isConnected) {
        this._connection = await this._connection.connect();
      }
    } catch (err) {
      Log.error(err);
    } finally {
      ConnectionWrapper._LOCK.release();
    }
    return Promise.resolve(this);
  }

  async close(): Promise<ConnectionWrapper> {
    await ConnectionWrapper._LOCK.acquire();
    try {
      await this.storage.remove(this);
    } catch (err) {
      Log.error(err);
    } finally {
      ConnectionWrapper._LOCK.release();
    }
    return Promise.resolve(this);
  }

}
