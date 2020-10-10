import {Connection, EntityManager} from 'typeorm';
import * as _ from 'lodash';
import {IConnection} from '../../IConnection';
import {TypeOrmStorageRef} from './TypeOrmStorageRef';
import {Semaphore} from '../../../Semaphore';
import {Log} from '../../../logging/Log';
import {LockFactory} from '../../../LockFactory';
import {EVENT_STORAGE_REF_PREPARED, EVENT_STORAGE_REF_SHUTDOWN} from './Constants';


export class TypeOrmConnectionWrapper implements IConnection {

  static $INC = 0;

  private static _LOCK: { [k: string]: Semaphore } = {};

  usage: number = 0;

  inc: number = TypeOrmConnectionWrapper.$INC++;

  private name: string = null;

  storageRef: TypeOrmStorageRef;

  _connection: Connection;

  _fn: { [k: string]: any } = {};


  constructor(s: TypeOrmStorageRef, conn?: Connection) {
    this.storageRef = s;
    this._connection = conn;
    this.name = this.storageRef.name;
    this._fn[EVENT_STORAGE_REF_PREPARED] = this.reload.bind(this);
    this._fn[EVENT_STORAGE_REF_SHUTDOWN] = this.destroy.bind(this);

    // this.storageRef.on(EVENT_STORAGE_ENTITY_ADDED, this.reload.bind(this));
    for (const k of _.keys(this._fn)) {
      this.storageRef.on(k, this._fn[k]);
    }

  }


  async reload() {
    const connected = this._connection && this._connection.isConnected;
    this.reset();
    this.connection;
    if (connected) {
      await this.connect();
    }
  }

  destroy() {
    // this.storageRef.removeListener(EVENT_STORAGE_ENTITY_ADDED, this.reload.bind(this));
    for (const k of _.keys(this._fn)) {
      this.storageRef.removeListener(k, this._fn[k]);
    }
  }


  get manager(): EntityManager {
    return this.connection.manager;
  }


  get connection() {
    if (!this._connection) {
      this._connection = this.getStorageRef().getConnection();
    }
    return this._connection;
  }


  reset() {
    this._connection = null;
  }


  get lock() {
    if (!_.has(TypeOrmConnectionWrapper._LOCK, this.name)) {
      TypeOrmConnectionWrapper._LOCK[this.name] = LockFactory.$().semaphore(1);
    }
    return TypeOrmConnectionWrapper._LOCK[this.name];
  }


  getStorageRef() {
    return this.storageRef;
  }


  usageInc() {
    return ++this.usage;
  }


  usageDec() {
    if (this.usage > 0) {
      return --this.usage;
    }
    return this.usage;
  }

  getUsage() {
    return this.usage;
  }


  /**
   * Is the connection opened
   */
  isOpened() {
    return this._connection && this._connection.isConnected;
  }


  isSingleConnection(): boolean {
    return this.storageRef.isSingleConnection();
  }


  isOnlyMemory(): boolean {
    return this.storageRef.isOnlyMemory();
  }


  async connect(): Promise<TypeOrmConnectionWrapper> {
    if (this.getUsage() <= 0) {
      await this.lock.acquire();
      try {
        const connection = this.connection;

        if (!connection.isConnected) {
          await this.connection.connect();
        }
        this.usageInc();
      } catch (err) {
        Log.error(err);
      } finally {
        this.lock.release();
      }
    } else {
      this.usageInc();
    }
    return Promise.resolve(this);
  }


  async close(): Promise<IConnection> {
    const rest = this.usageDec();
    if (rest <= 0) {
      await this.lock.acquire();
      try {
        this.destroy();
        await this.storageRef.remove(this);
      } catch (err) {
        Log.error(err);
      } finally {
        this.lock.release();
      }
    }
    return Promise.resolve(this);
  }

}
