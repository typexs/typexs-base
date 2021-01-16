import {SqliteConnectionOptions} from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import {IStorageOptions} from '../../src/libs/storage/IStorageOptions';
import {MongoConnectionOptions} from 'typeorm/driver/mongodb/MongoConnectionOptions';
import {PostgresConnectionOptions} from 'typeorm/driver/postgres/PostgresConnectionOptions';

export const SPAWN_TIMEOUT = 120000;

export const TEST_STORAGE_OPTIONS: IStorageOptions = process.env.SQL_LOG ?
  <SqliteConnectionOptions & IStorageOptions>{
    name: 'default',
    type: 'sqlite',
    database: ':memory:',
    synchronize: true,
    connectOnStartup: true,
    logger: 'simple-console',
    logging: 'all'
  } :
  <SqliteConnectionOptions & IStorageOptions>{
    name: 'default',
    type: 'sqlite',
    database: ':memory:',
    synchronize: true,
    connectOnStartup: true,
  };


export const TEST_MONGO_STORAGE_OPTIONS: IStorageOptions = process.env.SQL_LOG ?
  <MongoConnectionOptions & IStorageOptions>{
    name: 'default',
    type: 'mongodb',
    database: 'typexs',
    synchronize: true,
    connectOnStartup: true,
    logger: 'simple-console',
    logging: 'all'
  } :
  <MongoConnectionOptions & IStorageOptions>{
    name: 'default',
    type: 'mongodb',
    database: 'typexs',
    synchronize: true,
    connectOnStartup: true,
  };


export const TEST_PSQL_STORAGE_OPTIONS: IStorageOptions = process.env.SQL_LOG ?
  <PostgresConnectionOptions & IStorageOptions>{
    name: 'default',
    type: 'postgres',
    host: 'localhost',
    port: 5436,
    database: 'txsbase',
    username: 'txsbase',
    synchronize: true,
    connectOnStartup: true,
    logger: 'simple-console',
    logging: 'all'
  } :
  <PostgresConnectionOptions & IStorageOptions>{
    name: 'default',
    type: 'postgres',
    host: 'localhost',
    port: 5436,
    database: 'txsbase',
    username: 'txsbase',
    synchronize: true,
    connectOnStartup: true,
  };
