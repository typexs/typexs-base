// process.env.SQL_LOG = '1';

import {suite} from '@testdeck/mocha';
import {StorageAcontrollerAggregateSqlTemplate} from './storage_controller_aggregate.sql.template';

// let bootstrap: Bootstrap;
// let storageRef: StorageRef;
//
// let CarSql: ClassType<any> = null;
// let DriverSql: ClassType<any> = null;
// let CarParam: ClassType<any> = null;
// let controller: StorageEntityController = null;

@suite('functional/storage/controller_aggregate_sql (sqlite)')
class StorageControllerAggregateSqliteSpec extends StorageAcontrollerAggregateSqlTemplate {

  static async before() {
    await StorageAcontrollerAggregateSqlTemplate
      .initBefore(
        StorageControllerAggregateSqliteSpec,
        {
          storage: {
            default: {
              synchronize: true,
              type: 'sqlite',
              database: ':memory:'
            }
          }
        });
  }

  static async after() {
    await StorageAcontrollerAggregateSqlTemplate
      .initAfter();
  }


}

