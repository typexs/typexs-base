import {Connection, EntityManager} from 'typeorm';
import * as _ from 'lodash';
import {IConnection} from '../../IConnection';
import {TypeOrmStorageRef} from './TypeOrmStorageRef';
import {Semaphore} from '../../../Semaphore';
import {Log} from '../../../logging/Log';
import {LockFactory} from '../../../LockFactory';
import {EVENT_STORAGE_REF_PREPARED} from './Constants';


export class TypeOrmConnectionWrapper implements IConnection {

  static $INC = 0;

  private static _LOCK: { [k: string]: Semaphore } = {};

  usage: number = 0;

  inc: number = TypeOrmConnectionWrapper.$INC++;

  private name: string = null;

  storageRef: TypeOrmStorageRef;

  _connection: Connection;

  _fn: any;


  constructor(s: TypeOrmStorageRef, conn?: Connection) {
    this.storageRef = s;
    this._connection = conn;
    this.name = this.storageRef.name;
  }


  initialize() {
    const self = this;
    this._fn = function () {
      self.reload();
    };
    this.storageRef.on(EVENT_STORAGE_REF_PREPARED, this._fn);
  }


  async reload() {
    const connected = !!this._connection && this._connection.isConnected;
    this.reset();
    if (connected) {
      this.usageDec();
      await this.connect();
    }
  }


  destroy() {
    this.reset();
    if (this._fn) {
      this.storageRef.off(EVENT_STORAGE_REF_PREPARED, this._fn);
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
        await this.storageRef.remove(this);
        this.destroy();
      } catch (err) {
        Log.error(err);
      } finally {
        this.lock.release();
      }
    }
    return Promise.resolve(this);
  }

}
