import * as path from 'path';
import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';

import {Bootstrap} from '../../../src/Bootstrap';
import {TypeOrmSqlConditionsBuilder} from '../../../src/libs/storage/framework/typeorm/TypeOrmSqlConditionsBuilder';
import {TypeOrmEntityRegistry} from '../../../src/libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry';
import {SelectQueryBuilder} from 'typeorm';
import {MangoExpression} from '../../../src/libs/expressions/MangoExpression';

let bootstrap: Bootstrap;
let CarCondMango: any = null;
let DriverCondMango: any = null;

@suite('functional/storage/storage_sql_conditions_builder_mango')
class StorageSqlConditionsBuilderMangoSpec {


  static async before() {
    // TestHelper.typeOrmReset();
    // Bootstrap.reset();
    // Config.clear();
    const appdir = path.join(__dirname, 'fake_app_conditions_mango');
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
    CarCondMango = require('./fake_app_conditions_mango/entities/CarCondMango').CarCondMango;
    DriverCondMango = require('./fake_app_conditions_mango/entities/DriverCondMango').DriverCondMango;

    storageRef.addEntityType(CarCondMango);
    storageRef.addEntityType(DriverCondMango);
    await storageRef.prepare();

    const c = await storageRef.connect();
    const x = 1;
  }


  static async after() {
    if (bootstrap) {
      await bootstrap.shutdown();
      await bootstrap.getStorage().shutdown();
    }
  }


  @test
  async 'condition $eq'() {
    const query2 = await getMangoQuery({'name': 1}, CarCondMango, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond_mango" "car" WHERE "car"."name" = ?',
      [
        1
      ]
    ]);
  }


  @test
  async 'condition $lt'() {
    const query2 = await getMangoQuery({'id': {$lt: 1}}, CarCondMango, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond_mango" "car" WHERE "car"."id" < ?',
      [
        1
      ]
    ]);
  }

  @test
  async 'condition $le'() {
    const query2 = await getMangoQuery({'id': {$le: 1}}, CarCondMango, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond_mango" "car" WHERE "car"."id" <= ?',
      [
        1
      ]
    ]);
  }

  @test
  async 'condition $ge'() {
    const query2 = await getMangoQuery({'id': {$ge: 1}}, CarCondMango, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond_mango" "car" WHERE "car"."id" >= ?',
      [
        1
      ]
    ]);
  }


  @test
  async 'condition $gt'() {
    const query2 = await getMangoQuery({'id': {$gt: 1}}, CarCondMango, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond_mango" "car" WHERE "car"."id" > ?',
      [
        1
      ]
    ]);
  }

  @test
  async 'condition $in'() {
    const query2 = await getMangoQuery({'id': {$in: [1, 2, 3]}}, CarCondMango, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond_mango" "car" WHERE "car"."id" IN (?, ?, ?)',

      [1, 2, 3]

    ]);
  }

  @test
  async 'condition $isNull'() {
    const query2 = await getMangoQuery({'name': {$isNull: 1}}, CarCondMango, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond_mango" "car" WHERE "car"."name" IS NULL',
      []
    ]);
  }

  @test
  async 'condition $isNotNull'() {

    const query2 = await getMangoQuery({'name': {$isNotNull: 1}}, CarCondMango, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond_mango" "car" WHERE "car"."name" IS NOT NULL',
      []
    ]);
  }


  @test
  async 'condition $or'() {
    const query2 = await getMangoQuery({'$or': [{name: 'test'}, {id: 12}]}, CarCondMango, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond_mango" "car" WHERE ' +
      '("car"."name" = ?) OR ("car"."id" = ?)',
      [
        'test',
        12
      ]
    ]);
  }


  @test
  async 'condition $and'() {
    const query2 = await getMangoQuery({'$and': [{name: 'test'}, {id: 12}]}, CarCondMango, 'car');
    expect(query2).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond_mango" "car" WHERE ' +
      '("car"."name" = ?) AND ("car"."id" = ?)',
      [
        'test',
        12
      ]
    ]);
  }


  @test
  async 'build join conditions for one-to-many typeorm relation'() {
    const query = await getMangoQuery({'driver.id': 1}, CarCondMango, 'car');
    expect(query).to.deep.eq([
      'SELECT "car"."id" AS "car_id", "car"."name" AS "car_name" FROM "car_cond_mango" "car" LEFT JOIN "driver_cond_mango" "driver_cond_mango_1" ON ' +
      'driver_cond_mango_1.carId = "car"."id" WHERE "driver_cond_mango_1"."id" = ?',
      [
        1
      ]
    ]);
  }


  @test
  async 'build join conditions for many-to-one typeorm relation'() {
    const query = await getMangoQuery({'car.id': 1}, DriverCondMango, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", ' +
        '"driver"."lastName" AS "driver_lastName", "driver"."carId" AS "driver_carId" FROM "driver_cond_mango" "driver" ' +
        'LEFT JOIN "car_cond_mango" "car_cond_mango_1" ON "car_cond_mango_1"."id" = driver.carId WHERE "car_cond_mango_1"."id" = ?',
        [
          1
        ]
      ]
    );
  }


  @test
  async 'build conditions handle NULL values'() {
    const query = await getMangoQuery({'car.id': null}, DriverCondMango, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", "driver"."lastName" AS "driver_lastName", ' +
        '"driver"."carId" AS "driver_carId" FROM "driver_cond_mango" "driver" ' +
        'LEFT JOIN "car_cond_mango" "car_cond_mango_1" ON "car_cond_mango_1"."id" = driver.carId WHERE "car_cond_mango_1"."id" = ?',
        [
          null
        ]
      ]
    );
  }


  @test
  async 'build conditions handle NULL values: $ne'() {
    const query = await getMangoQuery({'car.id': {$ne: null}}, DriverCondMango, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", "driver"."lastName" AS "driver_lastName", ' +
        '"driver"."carId" AS "driver_carId" FROM "driver_cond_mango" "driver" ' +
        'LEFT JOIN "car_cond_mango" "car_cond_mango_1" ON "car_cond_mango_1"."id" = driver.carId WHERE "car_cond_mango_1"."id" <> ?',
        [
          null
        ]
      ]
    );
  }


  @test
  async 'build conditions handle NULL values: $isNull'() {
    const query = await getMangoQuery({'car.id': {$isNull: null}}, DriverCondMango, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", "driver"."lastName" AS "driver_lastName", ' +
        '"driver"."carId" AS "driver_carId" FROM "driver_cond_mango" "driver" ' +
        'LEFT JOIN "car_cond_mango" "car_cond_mango_1" ON "car_cond_mango_1"."id" = driver.carId WHERE "car_cond_mango_1"."id" IS NULL',
        []
      ]
    );

  }


  @test
  async 'build conditions handle NULL values: $isNotNull'() {
    const query = await getMangoQuery({'car.id': {$isNotNull: null}}, DriverCondMango, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", "driver"."lastName" AS "driver_lastName", ' +
        '"driver"."carId" AS "driver_carId" FROM "driver_cond_mango" "driver" ' +
        'LEFT JOIN "car_cond_mango" "car_cond_mango_1" ON "car_cond_mango_1"."id" = driver.carId WHERE "car_cond_mango_1"."id" IS NOT NULL',
        []
      ]
    );
  }


  @test
  async 'build conditions handle boolean values: true'() {
    const query = await getMangoQuery({'car.id': true}, DriverCondMango, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", "driver"."lastName" AS "driver_lastName", ' +
        '"driver"."carId" AS "driver_carId" FROM "driver_cond_mango" "driver" ' +
        'LEFT JOIN "car_cond_mango" "car_cond_mango_1" ON "car_cond_mango_1"."id" = driver.carId WHERE "car_cond_mango_1"."id" = ?',
        [true]
      ]
    );
  }


  @test
  async 'build conditions handle boolean values: false'() {
    const query = await getMangoQuery({'car.id': false}, DriverCondMango, 'driver');
    expect(query).to.deep.eq(
      [
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", "driver"."lastName" AS "driver_lastName", ' +
        '"driver"."carId" AS "driver_carId" FROM "driver_cond_mango" "driver" ' +
        'LEFT JOIN "car_cond_mango" "car_cond_mango_1" ON "car_cond_mango_1"."id" = driver.carId WHERE "car_cond_mango_1"."id" = ?',
        [false]
      ]
    );
  }

  @test
  async 'build chained conditions with $not and $eq'() {
    const query = await getMangoQuery({'id': {$not: {$eq: 1}}}, DriverCondMango, 'driver');
    expect(query[0]).to.deep.eq(
        'SELECT "driver"."id" AS "driver_id", "driver"."firstName" AS "driver_firstName", "driver"."lastName" AS "driver_lastName", ' +
        '"driver"."carId" AS "driver_carId" FROM "driver_cond_mango" "driver" WHERE NOT ("driver"."id" = ?)',
    );
    expect(query[1]).to.deep.eq([1]);
  }


  @test
  async 'build conditions for having mode'() {
    const ref = bootstrap.getStorage().get();
    const connection = await ref.connect();
    const sql = new TypeOrmSqlConditionsBuilder(
      connection.manager,
      TypeOrmEntityRegistry.$().getEntityRefFor(DriverCondMango),
      ref, 'select', 'driver');
    sql.setMode('having');
    (sql.getQueryBuilder() as SelectQueryBuilder<any>).select('SUM(id)', 'soneHavingField');
    (sql.getQueryBuilder() as SelectQueryBuilder<any>).addSelect('firstName');
    (sql.getQueryBuilder() as SelectQueryBuilder<any>).addGroupBy('firstName');
    sql.build({soneHavingField: {$gt: 0}});
    // having.whereFactory(sql.getQueryBuilder());
    const query2 = sql.baseQueryBuilder.getQueryAndParameters();
    await connection.close();
    expect(query2).to.deep.eq(
      [
        'SELECT SUM(id) AS "soneHavingField", firstName FROM "driver_cond_mango" "driver" GROUP BY firstName HAVING soneHavingField > ?',
        [0]
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


async function getMangoQuery(condition: any, type: Function, alias: string) {
  const ref = bootstrap.getStorage().get();
  const connection = await ref.connect();
  const sql = new TypeOrmSqlConditionsBuilder(connection.manager, TypeOrmEntityRegistry.$().getEntityRefFor(type), ref, 'select', alias);
  const exp = new MangoExpression(condition).getRoot();
  // console.log(inspect(exp, false, 10 ));
  const where = sql.build(exp);
  // (sql.getQueryBuilder() as SelectQueryBuilder<any>).where(where);
  const query2 = sql.baseQueryBuilder.getQueryAndParameters();
  await connection.close();
  return query2;
}
