// process.env.SQL_LOG = '1';

import {suite} from '@testdeck/mocha';
import {StorageAcontrollerAggregateSqlTemplate} from './storage_controller_aggregate.sql.template';
import {TypeOrmStorageRef} from '../../../src/libs/storage/framework/typeorm/TypeOrmStorageRef';

// let bootstrap: Bootstrap;
// let storageRef: StorageRef;
//
// let CarSql: ClassType<any> = null;
// let DriverSql: ClassType<any> = null;
// let CarParam: ClassType<any> = null;
// let controller: StorageEntityController = null;

@suite('functional/storage/controller_aggregate_sql (postgres)')
class StorageControllerAggregatePostgresSpec extends StorageAcontrollerAggregateSqlTemplate {

  static async before() {
    await StorageAcontrollerAggregateSqlTemplate
      .initBefore(
        StorageControllerAggregatePostgresSpec,
        {
        storage: {
          default: {
            synchronize: true,
            type: 'postgres',
            database: 'txsbase',
            username: 'txsbase',
            password: '',
            host: '127.0.0.1',
            port: 5436,
            // logging: 'all',
            // logger: 'simple-logger'
          }
        }
      });
  }

  static async after() {
    await StorageAcontrollerAggregateSqlTemplate
      .initAfter();
  }


  static async cleanup(ref: TypeOrmStorageRef) {
    const c = await ref.connect();
    await c.manager.query('TRUNCATE car_param RESTART IDENTITY CASCADE;');
    await c.manager.query('TRUNCATE driver_sql  RESTART IDENTITY CASCADE;');
    await c.manager.query('TRUNCATE car_sql  RESTART IDENTITY CASCADE;');
    await c.close();
  }

}

