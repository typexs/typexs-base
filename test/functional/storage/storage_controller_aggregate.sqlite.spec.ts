// process.env.SQL_LOG = '1';

import {suite} from 'mocha-typescript';
import {StorageAcontrollerAggregateSqlTemplate} from './storage_controller_aggregate.sql.template';

// let bootstrap: Bootstrap;
// let storageRef: StorageRef;
//
// let CarSql: ClassType<any> = null;
// let DriverSql: ClassType<any> = null;
// let CarParam: ClassType<any> = null;
// let controller: StorageEntityController = null;

@suite('functional/storage/controller_aggregate_sql (sqlite)')
class StorageControllerSqlSpec extends StorageAcontrollerAggregateSqlTemplate {

  static async before() {
    await StorageAcontrollerAggregateSqlTemplate
      .initBefore();
  }

  static async after() {
    await StorageAcontrollerAggregateSqlTemplate
      .initAfter();
  }


}

