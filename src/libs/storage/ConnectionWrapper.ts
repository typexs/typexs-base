// import {Connection, EntityManager, getConnectionManager} from 'typeorm';
// import {Log} from '../logging/Log';
// import {StorageRef} from './StorageRef';
// import {Semaphore} from '../Semaphore';
// import * as _ from 'lodash';
// import {LockFactory} from '../LockFactory';
//
// export class ConnectionWrapper {
//
//
//   constructor(s: StorageRef, conn?: Connection) {
//     this.storageRef = s;
//     this._connection = conn;
//     this.name = this.storageRef.name;
//
//   }
//
//
//   get manager(): EntityManager {
//     return this._connection.manager;
//   }
//
//
//   get connection() {
//     return this._connection;
//   }
//
//   get lock() {
//     if (!_.has(ConnectionWrapper._LOCK, this.name)) {
//       ConnectionWrapper._LOCK[this.name] = LockFactory.$().semaphore(1);
//     }
//     return ConnectionWrapper._LOCK[this.name];
//   }
//
//   static $INC = 0;
//
//   private static _LOCK: { [k: string]: Semaphore } = {};
//
//   usage: number = 0;
//
//   inc: number = ConnectionWrapper.$INC++;
//
//   private name: string = null;
//
//   storageRef: StorageRef;
//
//   _connection: Connection;
//
//   getStorageRef() {
//     return this.storageRef;
//   }
//
//
//   usageInc() {
//     return ++this.usage;
//   }
//
//   usageDec() {
//     if (this.usage > 0) {
//       return --this.usage;
//     }
//     return this.usage;
//
//   }
//
//   getUsage() {
//     return this.usage;
//   }
//
//   /**
//    * Persists (saves) all given entities in the database.
//    * If entities do not exist in the database then inserts, otherwise updates.
//    *
//    * @deprecated
//    */
//   persist<Entity>(o: Entity): Promise<any> {
//     return this.manager.save(o);
//   }
//
//
//   save<Entity>(o: Entity): Promise<any> {
//     try {
//       return this.manager.save(o);
//     } catch (err) {
//       Log.error(err);
//       throw err;
//     }
//   }
//
//
//   /**
//    * Is the connection opened
//    */
//   isOpened() {
//     return this._connection.isConnected;
//   }
//
//
//   isSingleConnection(): boolean {
//     return this.storageRef.isSingleConnection();
//   }
//
//
//   isOnlyMemory(): boolean {
//     return this.storageRef.isOnlyMemory();
//   }
//
//
//   async connect(): Promise<ConnectionWrapper> {
//     if (this.getUsage() <= 0) {
//       await this.lock.acquire();
//       try {
//         if (!this._connection) {
//           this._connection = await getConnectionManager().get(this.name);
//         }
//         if (!this._connection.isConnected) {
//           this._connection = await this._connection.connect();
//         }
//         this.usageInc();
//       } catch (err) {
//         Log.error(err);
//       } finally {
//         this.lock.release();
//       }
//     } else {
//       this.usageInc();
//     }
//     return Promise.resolve(this);
//   }
//
//
//   async close(): Promise<ConnectionWrapper> {
//     const rest = this.usageDec();
//     if (rest <= 0) {
//       await this.lock.acquire();
//       try {
//         await this.storageRef.remove(this);
//       } catch (err) {
//         Log.error(err);
//       } finally {
//         this.lock.release();
//       }
//     }
//     return Promise.resolve(this);
//   }
//
// }
