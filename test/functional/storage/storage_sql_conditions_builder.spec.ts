import * as path from 'path';
import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';

import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from 'commons-config';
import {TypeOrmSqlConditionsBuilder} from '../../../src/libs/storage/framework/typeorm/TypeOrmSqlConditionsBuilder';
import {TypeOrmEntityRegistry} from '../../../src/libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry';
import {TestHelper} from '../TestHelper';

let bootstrap: Bootstrap;
let Car: any = null;
let Driver: any = null;

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
    Car = require('./fake_app_conditions/entities/Car').Car;
    Driver = require('./fake_app_conditions/entities/Driver').Driver;

    storageRef.addEntityType(Car);
    storageRef.addEntityType(Driver);
    await storageRef.prepare();
  }

  static after() {
    Bootstrap.reset();
    Config.clear();

  }

  @test
  async 'condition $eq'() {
    const connection = await bootstrap.getStorage().get().connect();

    const sql = new TypeOrmSqlConditionsBuilder(connection.manager, TypeOrmEntityRegistry.$().getEntityRefFor(Car), 'car');
    const where = sql.build({'name': 1});
    sql.baseQueryBuilder.where(where);
    const query2 = sql.baseQueryBuilder.getQueryAndParameters();
    await connection.close();

    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car" "car" WHERE ("car"."name" = ?)',
      [
        1
      ]
    ]);
  }


  @test
  async 'condition $lt'() {
    const connection = await bootstrap.getStorage().get().connect();

    const sql = new TypeOrmSqlConditionsBuilder(connection.manager, TypeOrmEntityRegistry.$().getEntityRefFor(Car), 'car');
    const where = sql.build({'id': {$lt: 1}});
    sql.baseQueryBuilder.where(where);
    const query2 = sql.baseQueryBuilder.getQueryAndParameters();
    await connection.close();

    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car" "car" WHERE ("car"."id" < ?)',
      [
        1
      ]
    ]);
  }

  @test
  async 'condition $le'() {
    const connection = await bootstrap.getStorage().get().connect();

    const sql = new TypeOrmSqlConditionsBuilder(connection.manager, TypeOrmEntityRegistry.$().getEntityRefFor(Car), 'car');
    const where = sql.build({'id': {$le: 1}});
    sql.baseQueryBuilder.where(where);
    const query2 = sql.baseQueryBuilder.getQueryAndParameters();
    await connection.close();

    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car" "car" WHERE ("car"."id" <= ?)',
      [
        1
      ]
    ]);
  }

  @test
  async 'condition $ge'() {
    const connection = await bootstrap.getStorage().get().connect();

    const sql = new TypeOrmSqlConditionsBuilder(connection.manager, TypeOrmEntityRegistry.$().getEntityRefFor(Car), 'car');
    const where = sql.build({'id': {$ge: 1}});
    sql.baseQueryBuilder.where(where);
    const query2 = sql.baseQueryBuilder.getQueryAndParameters();
    await connection.close();

    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car" "car" WHERE ("car"."id" >= ?)',
      [
        1
      ]
    ]);
  }


  @test
  async 'condition $gt'() {
    const connection = await bootstrap.getStorage().get().connect();

    const sql = new TypeOrmSqlConditionsBuilder(connection.manager, TypeOrmEntityRegistry.$().getEntityRefFor(Car), 'car');
    const where = sql.build({'id': {$gt: 1}});
    sql.baseQueryBuilder.where(where);
    const query2 = sql.baseQueryBuilder.getQueryAndParameters();
    await connection.close();

    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car" "car" WHERE ("car"."id" > ?)',
      [
        1
      ]
    ]);
  }

  @test
  async 'condition $in'() {
    const connection = await bootstrap.getStorage().get().connect();

    const sql = new TypeOrmSqlConditionsBuilder(connection.manager, TypeOrmEntityRegistry.$().getEntityRefFor(Car), 'car');
    const where = sql.build({'id': {$in: [1, 2, 3]}});
    sql.baseQueryBuilder.where(where);
    const query2 = sql.baseQueryBuilder.getQueryAndParameters();
    await connection.close();
    const e = await sql.baseQueryBuilder.getManyAndCount();

    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car" "car" WHERE ("car"."id" IN (?, ?, ?))',

      [1, 2, 3]

    ]);
  }

  @test
  async 'condition $isNull'() {
    const connection = await bootstrap.getStorage().get().connect();

    const sql = new TypeOrmSqlConditionsBuilder(connection.manager, TypeOrmEntityRegistry.$().getEntityRefFor(Car), 'car');
    const where = sql.build({'name': {$isNull: 1}});
    sql.baseQueryBuilder.where(where);
    const query2 = sql.baseQueryBuilder.getQueryAndParameters();
    await connection.close();

    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car" "car" WHERE ("car"."name" IS NULL)',
      []
    ]);
  }

  @test
  async 'condition $isNotNull'() {
    const connection = await bootstrap.getStorage().get().connect();

    const sql = new TypeOrmSqlConditionsBuilder(connection.manager, TypeOrmEntityRegistry.$().getEntityRefFor(Car), 'car');
    const where = sql.build({'name': {$isNotNull: 1}});
    sql.baseQueryBuilder.where(where);
    const query2 = sql.baseQueryBuilder.getQueryAndParameters();
    await connection.close();

    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car" "car" WHERE ("car"."name" IS NOT NULL)',
      []
    ]);
  }


  @test
  async 'condition $or'() {
    const connection = await bootstrap.getStorage().get().connect();

    const sql = new TypeOrmSqlConditionsBuilder(connection.manager, TypeOrmEntityRegistry.$().getEntityRefFor(Car), 'car');
    const where = sql.build({'$or': [{name: 'test'}, {id: 12}]});
    sql.baseQueryBuilder.where(where);
    const query2 = sql.baseQueryBuilder.getQueryAndParameters();
    await connection.close();

    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car" "car" WHERE (("car"."name" = ?) OR ("car"."id" = ?))',
      [
        'test',
        12
      ]
    ]);
  }


  @test
  async 'condition $and'() {
    const connection = await bootstrap.getStorage().get().connect();

    const sql = new TypeOrmSqlConditionsBuilder(connection.manager, TypeOrmEntityRegistry.$().getEntityRefFor(Car), 'car');
    const where = sql.build({'$and': [{name: 'test'}, {id: 12}]});
    sql.baseQueryBuilder.where(where);
    const query2 = sql.baseQueryBuilder.getQueryAndParameters();
    await connection.close();

    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car" "car" WHERE (("car"."name" = ?) AND ("car"."id" = ?))',
      [
        'test',
        12
      ]
    ]);
  }


  @test
  async 'build join conditions for one-to-many typeorm relation'() {
    // const connection = await bootstrap.getStorage().get().connect();
    //
    // const sql = new TypeOrmSqlConditionsBuilder(connection.manager, TypeOrmEntityRegistry.$().getEntityRefFor(Car), 'car');
    // const where = sql.build({'driver.id': 1});
    // sql.baseQueryBuilder.where(where);
    // const query2 = sql.baseQueryBuilder.getQueryAndParameters();
    // await connection.close();
    const query = await getQuery({'driver.id': 1}, Car, 'car');
    expect(query).to.deep.eq([

      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car" "car" LEFT JOIN "driver" "driver_1" ON ' +
      'driver_1.carId = "car"."id" WHERE ("driver_1"."id" = ?)',
      [
        1
      ]
      //
      // 'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car" "car" ' +
      // 'LEFT JOIN "driver" "driver_1" ON driver_1.carId = "car"."id" ' +
      // 'WHERE "driver_1"."id" = 1',
      // []
    ]);
    // expect(where).to.eq('driver_1.id = 1');
    // expect(sql.getJoins()).to.deep.eq([{
    //   alias: 'driver_1',
    //   table: 'driver',
    //   condition: 'driver_1.carId = car.id'
    // }]);
  }


  @test
  async 'build join conditions for many-to-one typeorm relation'() {

    const query = await getQuery({'car.id': 1}, Driver, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", ' +
        '"driver"."lastName" AS "driver_lastName", "driver"."carId" AS "driver_carId" FROM "driver" "driver" ' +
        'LEFT JOIN "car" "car_1" ON "car_1"."id" = driver.carId WHERE ("car_1"."id" = ?)',
        [
          1
        ]
      ]
    );
  }


  @test
  async 'build conditions handle NULL values'() {
    const query = await getQuery({'car.id': null}, Driver, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", "driver"."lastName" AS "driver_lastName", ' +
        '"driver"."carId" AS "driver_carId" FROM "driver" "driver" ' +
        'LEFT JOIN "car" "car_1" ON "car_1"."id" = driver.carId WHERE ("car_1"."id" = ?)',
        [
          null
        ]
      ]
    );
  }


  @test
  async 'build conditions handle NULL values: $ne'() {
    const query = await getQuery({'car.id': {$ne: null}}, Driver, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", "driver"."lastName" AS "driver_lastName", ' +
        '"driver"."carId" AS "driver_carId" FROM "driver" "driver" ' +
        'LEFT JOIN "car" "car_1" ON "car_1"."id" = driver.carId WHERE ("car_1"."id" <> ?)',
        [
          null
        ]
      ]
    );
  }


  @test
  async 'build conditions handle NULL values: $isNull'() {
    const query = await getQuery({'car.id': {$isNull: null}}, Driver, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", "driver"."lastName" AS "driver_lastName", ' +
        '"driver"."carId" AS "driver_carId" FROM "driver" "driver" ' +
        'LEFT JOIN "car" "car_1" ON "car_1"."id" = driver.carId WHERE ("car_1"."id" IS NULL)',
        []
      ]
    );

  }


  @test
  async 'build conditions handle NULL values: $isNotNull'() {
    const query = await getQuery({'car.id': {$isNotNull: null}}, Driver, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", "driver"."lastName" AS "driver_lastName", ' +
        '"driver"."carId" AS "driver_carId" FROM "driver" "driver" ' +
        'LEFT JOIN "car" "car_1" ON "car_1"."id" = driver.carId WHERE ("car_1"."id" IS NOT NULL)',
        []
      ]
    );
  }


  @test
  async 'build conditions handle boolean values: true'() {
    const query = await getQuery({'car.id': true}, Driver, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", "driver"."lastName" AS "driver_lastName", ' +
        '"driver"."carId" AS "driver_carId" FROM "driver" "driver" ' +
        'LEFT JOIN "car" "car_1" ON "car_1"."id" = driver.carId WHERE ("car_1"."id" = ?)',
        [true]
      ]
    );
  }


  @test
  async 'build conditions handle boolean values: false'() {
    const query = await getQuery({'car.id': false}, Driver, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", "driver"."lastName" AS "driver_lastName", ' +
        '"driver"."carId" AS "driver_carId" FROM "driver" "driver" ' +
        'LEFT JOIN "car" "car_1" ON "car_1"."id" = driver.carId WHERE ("car_1"."id" = ?)',
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
  const sql = new TypeOrmSqlConditionsBuilder(connection.manager, TypeOrmEntityRegistry.$().getEntityRefFor(type), alias);
  const where = sql.build(condition);
  sql.baseQueryBuilder.where(where);
  const query2 = sql.baseQueryBuilder.getQueryAndParameters();
  await connection.close();
  return query2;
}
