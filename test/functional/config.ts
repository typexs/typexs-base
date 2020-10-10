import {SqliteConnectionOptions} from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import {IStorageOptions} from '../../src/libs/storage/IStorageOptions';
import {MongoConnectionOptions} from 'typeorm/driver/mongodb/MongoConnectionOptions';

export const TEST_STORAGE_OPTIONS: IStorageOptions = process.env.SQL_LOG ? <SqliteConnectionOptions & IStorageOptions>{
  name: 'default',
  type: 'sqlite',
  database: ':memory:',
  synchronize: true,
  connectOnStartup: true,
  logger: 'simple-console',
  logging: 'all'
  // tablesPrefix: ""

} : <SqliteConnectionOptions & IStorageOptions>{
  name: 'default',
  type: 'sqlite',
  database: ':memory:',
  synchronize: true,
  connectOnStartup: true,

};


export const TEST_MONGO_STORAGE_OPTIONS: IStorageOptions = process.env.SQL_LOG ? <MongoConnectionOptions & IStorageOptions>{
  name: 'default',
  type: 'mongodb',
  database: 'typexs',
  synchronize: true,
  connectOnStartup: true,
  logger: 'simple-console',
  logging: 'all'
  // tablesPrefix: ""

} : <MongoConnectionOptions & IStorageOptions>{
  name: 'default',
  type: 'mongodb',
  database: 'typexs',
  synchronize: true,
  connectOnStartup: true,

};
