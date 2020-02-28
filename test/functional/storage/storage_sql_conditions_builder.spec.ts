import * as path from 'path';
import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';

import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from 'commons-config';
import {TypeOrmSqlConditionsBuilder} from '../../../src/libs/storage/framework/typeorm/TypeOrmSqlConditionsBuilder';
import {TypeOrmEntityRegistry} from '../../../src/libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry';
import {TestHelper} from '../TestHelper';
import {SelectQueryBuilder} from 'typeorm';

let bootstrap: Bootstrap;
let CarCond: any = null;
let DriverCond: any = null;

@suite('functional/storage/storage_sql_conditions_builder')
class StorageSqlConditionsBuilderSpec {


  static async before() {
    TestHelper.typeOrmReset();
    Bootstrap.reset();
    Config.clear();
    const appdir = path.join(__dirname, 'fake_app_conditions');
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

    const storageManager = bootstrap.getStorage();
    const storageRef = storageManager.get();
    CarCond = require('./fake_app_conditions/entities/CarCond').CarCond;
    DriverCond = require('./fake_app_conditions/entities/DriverCond').DriverCond;

    storageRef.addEntityType(CarCond);
    storageRef.addEntityType(DriverCond);
    await storageRef.prepare();
  }


  static after() {
    Bootstrap.reset();
    Config.clear();
  }


  @test
  async 'condition $eq'() {
    const query2 = await getQuery({'name': 1}, CarCond, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond" "car" WHERE ("car"."name" = ?)',
      [
        1
      ]
    ]);
  }


  @test
  async 'condition $lt'() {
    const query2 = await getQuery({'id': {$lt: 1}}, CarCond, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond" "car" WHERE ("car"."id" < ?)',
      [
        1
      ]
    ]);
  }

  @test
  async 'condition $le'() {
    const query2 = await getQuery({'id': {$le: 1}}, CarCond, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond" "car" WHERE ("car"."id" <= ?)',
      [
        1
      ]
    ]);
  }

  @test
  async 'condition $ge'() {
    const query2 = await getQuery({'id': {$ge: 1}}, CarCond, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond" "car" WHERE ("car"."id" >= ?)',
      [
        1
      ]
    ]);
  }


  @test
  async 'condition $gt'() {
    const query2 = await getQuery({'id': {$gt: 1}}, CarCond, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond" "car" WHERE ("car"."id" > ?)',
      [
        1
      ]
    ]);
  }

  @test
  async 'condition $in'() {
    const query2 = await getQuery({'id': {$in: [1, 2, 3]}}, CarCond, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond" "car" WHERE ("car"."id" IN (?, ?, ?))',

      [1, 2, 3]

    ]);
  }

  @test
  async 'condition $isNull'() {
    const query2 = await getQuery({'name': {$isNull: 1}}, CarCond, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond" "car" WHERE ("car"."name" IS NULL)',
      []
    ]);
  }

  @test
  async 'condition $isNotNull'() {

    const query2 = await getQuery({'name': {$isNotNull: 1}}, CarCond, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond" "car" WHERE ("car"."name" IS NOT NULL)',
      []
    ]);
  }


  @test
  async 'condition $or'() {

    const query2 = await getQuery({'$or': [{name: 'test'}, {id: 12}]}, CarCond, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond" "car" WHERE (("car"."name" = ?) OR ("car"."id" = ?))',
      [
        'test',
        12
      ]
    ]);
  }


  @test
  async 'condition $and'() {
    const query2 = await getQuery({'$and': [{name: 'test'}, {id: 12}]}, CarCond, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond" "car" WHERE (("car"."name" = ?) AND ("car"."id" = ?))',
      [
        'test',
        12
      ]
    ]);
  }


  @test
  async 'build join conditions for one-to-many typeorm relation'() {
    const query = await getQuery({'driver.id': 1}, CarCond, 'car');
    expect(query).to.deep.eq([

      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond" "car" LEFT JOIN "driver_cond" "driver_cond_1" ON ' +
      'driver_cond_1.carId = "car"."id" WHERE ("driver_cond_1"."id" = ?)',
      [
        1
      ]
    ]);
  }


  @test
  async 'build join conditions for many-to-one typeorm relation'() {
    const query = await getQuery({'car.id': 1}, DriverCond, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", ' +
        '"driver"."lastName" AS "driver_lastName", "driver"."carId" AS "driver_carId" FROM "driver_cond" "driver" ' +
        'LEFT JOIN "car_cond" "car_cond_1" ON "car_cond_1"."id" = driver.carId WHERE ("car_cond_1"."id" = ?)',
        [
          1
        ]
      ]
    );
  }


  @test
  async 'build conditions handle NULL values'() {
    const query = await getQuery({'car.id': null}, DriverCond, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", "driver"."lastName" AS "driver_lastName", ' +
        '"driver"."carId" AS "driver_carId" FROM "driver_cond" "driver" ' +
        'LEFT JOIN "car_cond" "car_cond_1" ON "car_cond_1"."id" = driver.carId WHERE ("car_cond_1"."id" = ?)',
        [
          null
        ]
      ]
    );
  }


  @test
  async 'build conditions handle NULL values: $ne'() {
    const query = await getQuery({'car.id': {$ne: null}}, DriverCond, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", "driver"."lastName" AS "driver_lastName", ' +
        '"driver"."carId" AS "driver_carId" FROM "driver_cond" "driver" ' +
        'LEFT JOIN "car_cond" "car_cond_1" ON "car_cond_1"."id" = driver.carId WHERE ("car_cond_1"."id" <> ?)',
        [
          null
        ]
      ]
    );
  }


  @test
  async 'build conditions handle NULL values: $isNull'() {
    const query = await getQuery({'car.id': {$isNull: null}}, DriverCond, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", "driver"."lastName" AS "driver_lastName", ' +
        '"driver"."carId" AS "driver_carId" FROM "driver_cond" "driver" ' +
        'LEFT JOIN "car_cond" "car_cond_1" ON "car_cond_1"."id" = driver.carId WHERE ("car_cond_1"."id" IS NULL)',
        []
      ]
    );

  }


  @test
  async 'build conditions handle NULL values: $isNotNull'() {
    const query = await getQuery({'car.id': {$isNotNull: null}}, DriverCond, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", "driver"."lastName" AS "driver_lastName", ' +
        '"driver"."carId" AS "driver_carId" FROM "driver_cond" "driver" ' +
        'LEFT JOIN "car_cond" "car_cond_1" ON "car_cond_1"."id" = driver.carId WHERE ("car_cond_1"."id" IS NOT NULL)',
        []
      ]
    );
  }


  @test
  async 'build conditions handle boolean values: true'() {
    const query = await getQuery({'car.id': true}, DriverCond, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", "driver"."lastName" AS "driver_lastName", ' +
        '"driver"."carId" AS "driver_carId" FROM "driver_cond" "driver" ' +
        'LEFT JOIN "car_cond" "car_cond_1" ON "car_cond_1"."id" = driver.carId WHERE ("car_cond_1"."id" = ?)',
        [true]
      ]
    );
  }


  @test
  async 'build conditions handle boolean values: false'() {
    const query = await getQuery({'car.id': false}, DriverCond, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", "driver"."lastName" AS "driver_lastName", ' +
        '"driver"."carId" AS "driver_carId" FROM "driver_cond" "driver" ' +
        'LEFT JOIN "car_cond" "car_cond_1" ON "car_cond_1"."id" = driver.carId WHERE ("car_cond_1"."id" = ?)',
        [false]
      ]
    );
  }

  @test.skip
  async 'build join conditions for one-to-one typeorm relation'() {

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


async function getQuery(condition: any, type: Function, alias: string) {
  const connection = await bootstrap.getStorage().get().connect();
  const sql = new TypeOrmSqlConditionsBuilder(connection.manager, TypeOrmEntityRegistry.$().getEntityRefFor(type), 'select', alias);
  const where = sql.build(condition);
  (sql.getQueryBuilder() as SelectQueryBuilder<any>).where(where);
  const query2 = sql.baseQueryBuilder.getQueryAndParameters();
  await connection.close();
  return query2;
}
