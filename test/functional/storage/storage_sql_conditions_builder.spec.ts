import * as path from "path";
import {suite, test} from "mocha-typescript";
import {expect} from "chai";

import {Bootstrap} from "../../../src/Bootstrap";
import {Config} from "commons-config";
import {TypeOrmSqlConditionsBuilder} from "../../../src/libs/storage/framework/typeorm/TypeOrmSqlConditionsBuilder";
import {PlatformTools} from "typeorm/platform/PlatformTools";
import {TypeOrmEntityRegistry} from "../../../src/libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry";
import {TestHelper} from "../TestHelper";

let bootstrap: Bootstrap;
let Car:any = null;
let Driver:any = null;

@suite('functional/storage/storage_sql_conditions_builder')
class Storage_sql_conditions_builderSpec {


  static async before() {
    TestHelper.typeOrmReset();
    Bootstrap.reset();
    Config.clear();
    let appdir = path.join(__dirname, 'fake_app_conditions');
    bootstrap = await Bootstrap
      .configure({
        app: {
          path: appdir
        },
        modules: {
          paths: [__dirname + '/../../..']
        }
      })
      .prepareRuntime();

    bootstrap = await bootstrap.activateStorage();

    let storageManager = bootstrap.getStorage();
    let storageRef = storageManager.get();
    Car = require('./fake_app_conditions/entities/Car').Car;
    Driver = require('./fake_app_conditions/entities/Driver').Driver;

    storageRef.addEntityType(Car);
    storageRef.addEntityType(Driver);
    await storageRef.prepare()
  }

  static after() {
    Bootstrap.reset();
    Config.clear();

  }

  @test
  async 'build join conditions for one-to-many typeorm relation'() {

    let sql = new TypeOrmSqlConditionsBuilder(TypeOrmEntityRegistry.$().getEntityRefFor(Car), 'car');
    let where = sql.build({'driver.id': 1});

    expect(where).to.eq("driver_1.id = '1'");
    expect(sql.getJoins()).to.deep.eq([{
      alias: 'driver_1',
      table: 'driver',
      condition: 'driver_1.carId = car.id'
    }]);


  }

  @test.skip
  async 'build join conditions for one-to-one typeorm relation'() {

  }

  @test
  async 'build join conditions for many-to-one typeorm relation'() {

    let sql = new TypeOrmSqlConditionsBuilder(TypeOrmEntityRegistry.$().getEntityRefFor(Driver), 'driver');
    let where = sql.build({'car.id': 1});

    expect(where).to.eq("car_1.id = '1'");
    expect(sql.getJoins()).to.deep.eq([{
      alias: 'car_1',
      table: 'car',
      condition: 'car_1.id = driver.carId'
    }]);
  }

  @test.skip
  async 'build join conditions for many-to-many typeorm relation'() {

  }

  @test.skip
  async 'build join conditions for typeorm join columns'() {

  }

  @test.skip
  async 'build join conditions for typeorm join table'() {

  }

}

