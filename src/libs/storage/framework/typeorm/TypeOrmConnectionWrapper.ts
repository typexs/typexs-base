import {Connection, EntityManager, getConnectionManager} from 'typeorm';
import * as _ from 'lodash';
import {IConnection} from '../../IConnection';
import {TypeOrmStorageRef} from './TypeOrmStorageRef';
import {Semaphore} from '../../../Semaphore';
import {Log} from '../../../logging/Log';
import {LockFactory} from '../../../LockFactory';
import {EVENT_STORAGE_ENTITY_ADDED, EVENT_STORAGE_REF_SHUTDOWN} from './Constants';


export class TypeOrmConnectionWrapper implements IConnection {

  static $INC = 0;

  private static _LOCK: { [k: string]: Semaphore } = {};

  usage: number = 0;

  inc: number = TypeOrmConnectionWrapper.$INC++;

  private name: string = null;

  storageRef: TypeOrmStorageRef;

  _connection: Connection;


  constructor(s: TypeOrmStorageRef, conn?: Connection) {
    this.storageRef = s;
    this._connection = conn;
    this.name = this.storageRef.name;
    this.storageRef.on(EVENT_STORAGE_ENTITY_ADDED, this.reload.bind(this));
    this.storageRef.on(EVENT_STORAGE_REF_SHUTDOWN, this.destroy.bind(this));
  }


  async reload() {
    const connected = this._connection && this._connection.isConnected;
    this._connection = getConnectionManager().get(this.name);
    if (connected) {
      await this.connect();
    }
  }

  async destroy() {
    this.storageRef.removeListener(EVENT_STORAGE_ENTITY_ADDED, this.reload.bind(this));
    this.storageRef.removeListener(EVENT_STORAGE_REF_SHUTDOWN, this.destroy.bind(this));
  }


  get manager(): EntityManager {
    return this._connection.manager;
  }


  get connection() {
    return this._connection;
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
        if (!this._connection) {
          this._connection = getConnectionManager().get(this.name);
        }
        if (!this._connection.isConnected) {
          this._connection = await this._connection.connect();
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
