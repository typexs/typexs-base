import * as path from 'path';
import * as _ from 'lodash';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from '@allgemein/config';
import {ClassType} from '@allgemein/schema-api';
import {TypeOrmEntityController} from '../../../src/libs/storage/framework/typeorm/TypeOrmEntityController';
import {TypeOrmStorageRef} from '../../../src/libs/storage/framework/typeorm/TypeOrmStorageRef';
import {getMetadataArgsStorage} from 'typeorm';
import {TypeOrmEntityRegistry} from '../../../src/libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry';


let bootstrap: Bootstrap;
let storageRef: TypeOrmStorageRef;

let MdbCar: ClassType<any> = null;
let MdbPerson: ClassType<any> = null;
let MdbDriver: ClassType<any> = null;
let controller: TypeOrmEntityController = null;


@suite('functional/storage/controller_mongo')
class StorageControllerMongoSpec {

  static after() {
    _.remove(getMetadataArgsStorage().columns, x => x.mode === 'objectId' || x.propertyName === '_id');
  }


  async before() {
    // TestHelper.typeOrmReset();
    Bootstrap.reset();
    Config.clear();

    MdbCar = require('./fake_app_mongo/entities/MdbCar').MdbCar;
    MdbDriver = require('./fake_app_mongo/entities/MdbDriver').MdbDriver;
    MdbPerson = require('./fake_app_mongo/entities/MdbPerson').MdbPerson;

    const appdir = path.join(__dirname, 'fake_app_mongo');
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
    storageRef = storageManager.get();
    storageRef.addEntityType(MdbCar);
    storageRef.addEntityType(MdbDriver);

    const c = await storageRef.connect();
    await c.manager.getMongoRepository(MdbCar).deleteMany({});
    await c.manager.getMongoRepository(MdbDriver).deleteMany({});
    await c.manager.getMongoRepository(MdbPerson).deleteMany({});
    await c.close();


    controller = storageRef.getController();
  }


  async after() {
    if (bootstrap) {
      // await controller.close();
      await bootstrap.shutdown();
      await bootstrap.getStorage().shutdown();
      TypeOrmEntityRegistry.reset();
    }
  }

  @test
  async 'lifecycle save, find, remove'() {

    let inc = 0;
    const car1 = new MdbDriver();
    car1.firstName = 'Black';
    car1.lastName = 'Yellow';
    car1.id = 'rec-' + (inc++);

    const car2 = new MdbDriver();
    car2.firstName = 'Red';
    car2.lastName = 'Green';
    car2.id = 'rec-' + (inc++);

    const car3 = new MdbDriver();
    car3.firstName = 'Blue';
    car3.lastName = 'Pink';
    car3.id = 'rec-' + (inc++);

    const car4 = new MdbDriver();
    car4.firstName = 'Gray';
    car4.lastName = 'Dark';
    car4.id = 'rec-' + (inc++);

    let driver_save_res = await controller.save([car1, car2, car3]);

    // first insert
    expect(driver_save_res).to.deep.eq([{
        firstName: 'Black',
        lastName: 'Yellow',
        id: 'rec-0',
        _id: 'rec-0'
      },
        {firstName: 'Red', lastName: 'Green', id: 'rec-1', _id: 'rec-1'},
        {firstName: 'Blue', lastName: 'Pink', id: 'rec-2', _id: 'rec-2'}]
    );
    car3.lastName = 'Pinky';
    driver_save_res = await controller.save([car1, car2, car3, car4], {raw: true});

    const car = new MdbCar();
    car.name = 'Team Blue';
    car.driver = [car1, car2];
    car.id = 'rec-' + (inc++);

    const car_ = new MdbCar();
    car_.name = 'Team Yellow';
    car_.driver = [car3];
    car_.id = 'rec-' + (inc++);

    const car_save_res = await controller.save(car);
    expect(car_save_res).to.deep.include({
      name: 'Team Blue',
      id: 'rec-4'
    });
    expect(car_save_res.driver).to.have.length(2);

    const car_save_res2 = await controller.save(car_);
    expect(car_save_res2).to.deep.include({
      name: 'Team Yellow',
      id: 'rec-5'
    });
    expect(car_save_res2.driver).to.have.length(1);

    const car_found_all = await controller.find(MdbCar);

    expect(car_found_all).to.have.length(2);
    expect(car_found_all).to.deep.eq([{
      id: 'rec-4',
      name: 'Team Blue',
      driver:
        [{
          firstName: 'Black',
          lastName: 'Yellow',
          id: 'rec-0',
          _id: 'rec-0'
        },
          {firstName: 'Red', lastName: 'Green', id: 'rec-1', _id: 'rec-1'}]
    },
      {
        id: 'rec-5',
        name: 'Team Yellow',
        driver:
          [{
            firstName: 'Blue',
            lastName: 'Pinky',
            id: 'rec-2',
            _id: 'rec-2'
          }]
      }]);
    expect(car_found_all[0]).to.be.instanceOf(MdbCar);

    const driver_found_all = await controller.find(MdbDriver, null, {raw: true});
    // console.log(driver_found_all);
    expect(driver_found_all).to.deep.eq([{
      _id: 'rec-0',
      firstName: 'Black',
      lastName: 'Yellow',
      id: 'rec-0'
    },
      {_id: 'rec-1', firstName: 'Red', lastName: 'Green', id: 'rec-1'},
      {
        _id: 'rec-2',
        firstName: 'Blue',
        lastName: 'Pinky',
        id: 'rec-2'
      },
      {_id: 'rec-3', firstName: 'Gray', lastName: 'Dark', id: 'rec-3'}]);

    const car_found = await controller.find(MdbCar, {id: car.id});
    expect(car_found).to.have.length(1);

    const car_found_raw = await controller.find(MdbCar, {id: car_.id}, {raw: true});
    // console.log(inspect(car_found_raw, null, 10));
    expect(car_found_raw).to.have.length(1);
    expect(car_found_raw[0]).to.deep.eq({
      _id: 'rec-5',
      name: 'Team Yellow',
      driver:
        [{
          firstName: 'Blue',
          lastName: 'Pinky',
          id: 'rec-2',
          _id: 'rec-2'
        }],
      id: 'rec-5'
    });
    expect(car_found_raw[0]).to.be.not.instanceOf(MdbCar);

    const car_by_driver = await controller.find(MdbCar, {'driver.id': car1.id});
    // console.log(inspect(car_by_driver, false, 10));
    expect(car_by_driver).to.have.length(1);
    expect(car_by_driver[0]).to.deep.eq({
      id: 'rec-4',
      name: 'Team Blue',
      driver:
        [{
          firstName: 'Black',
          lastName: 'Yellow',
          id: 'rec-0',
          _id: 'rec-0'
        },
          {firstName: 'Red', lastName: 'Green', id: 'rec-1', _id: 'rec-1'}]
    });

    const removeCount = await controller.remove(car_by_driver);
    expect(removeCount).to.eq(1);
    // expect(_.map(removeCount, (d: any) => d.id)).to.deep.eq([undefined]);

    const car_by_driver_empty = await controller.find(MdbCar, {'driver.id': car1.id});
    expect(car_by_driver_empty).to.have.length(0);
  }


  @test
  async 'remove by conditions'() {

    const car1 = new MdbDriver();
    car1.id = 'car-1';
    car1.firstName = 'Black';
    car1.lastName = 'Yellow';

    const car2 = new MdbDriver();
    car2.id = 'car-2';
    car2.firstName = 'Blue';
    car2.lastName = 'Green';

    const car3 = new MdbDriver();
    car3.id = 'car-3';
    car3.firstName = 'Blue';
    car3.lastName = 'Pink';

    const driver_save_res = await controller.save([car1, car2, car3]);

    const driver_found = await controller.find(MdbDriver);
    expect(driver_found).to.have.length(3);

    const driver_removed_count = await controller.remove(MdbDriver, {firstName: 'Blue'});
    expect(driver_removed_count).to.not.eq(-1);

    const driver_found_rest = await controller.find(MdbDriver);
    expect(driver_found_rest).to.have.length(1);


  }


  @test
  async 'update by conditions'() {

    const car1 = new MdbDriver();
    car1.id = 'car-1';
    car1.firstName = 'Green';
    car1.lastName = 'Yellow';

    const car2 = new MdbDriver();
    car2.id = 'car-2';
    car2.firstName = 'Blue';
    car2.lastName = 'Green';

    const car3 = new MdbDriver();
    car3.id = 'car-3';
    car3.firstName = 'Blue';
    car3.lastName = 'Pink';

    const driver_save_res = await controller.save([car1, car2, car3]);

    const driver_found = await controller.find(MdbDriver);
    expect(driver_found).to.have.length(3);

    const driver_removed_count = await controller.update(MdbDriver, {firstName: 'Blue'}, {$set: {firstName: 'Black'}});
    expect(driver_removed_count).to.not.eq(-1);

    const driver_found_rest = await controller.find(MdbDriver, {firstName: 'Black'});
    expect(driver_found_rest).to.have.length(2);


  }

  @test
  async 'aggregate'() {

    const car1 = new MdbPerson();
    car1.id = 'person-1';
    car1.firstName = 'Green';
    car1.lastName = 'Yellow';
    car1.age = 10;

    const car2 = new MdbPerson();
    car2.id = 'person-2';
    car2.firstName = 'Blue';
    car2.lastName = 'Green';
    car2.age = 20;

    const car3 = new MdbPerson();
    car3.id = 'person-3';
    car3.firstName = 'Blue';
    car3.lastName = 'Pink';
    car3.age = 30;

    const driver_save_res = await controller.save([car1, car2, car3]);

    const driver_found = await controller.find(MdbPerson);
    expect(driver_found).to.have.length(3);

    const driver_removed_count = await controller.aggregate(MdbPerson, [{$match: {firstName: 'Blue'}}, {
      $group: {
        _id: 'count',
        sum: {$sum: '$age'}
      }
    }]);
    expect(driver_removed_count).to.deep.eq([{_id: 'count', sum: 50}]);
  }


  @test
  async 'aggregate with sort / offset / limit'() {

    const car1 = new MdbPerson();
    car1.id = 'person-10';
    car1.firstName = 'Green';
    car1.lastName = 'Pink';
    car1.age = 100;

    const car2 = new MdbPerson();
    car2.id = 'person-20';
    car2.firstName = 'Yellow';
    car2.lastName = 'Pink';
    car2.age = 200;

    const car3 = new MdbPerson();
    car3.id = 'person-30';
    car3.firstName = 'Blue';
    car3.lastName = 'Pink';
    car3.age = 300;

    const driver_save_res = await controller.save([car1, car2, car3]);

    const driver_found = await controller.find(MdbPerson);
    expect(driver_found).to.have.length(3);

    const driver_removed_count = await controller.aggregate(MdbPerson, [
        {$match: {lastName: 'Pink'}},
        {
          $project: {
            last: '$lastName',
            age: '$age'
          }
        },
      ],
      {sort: {age: 'desc'}});
    expect(driver_removed_count).to.deep.eq([
      {
        '_id': 'person-30',
        'age': 300,
        'last': 'Pink',
      },
      {
        '_id': 'person-20',
        'age': 200,
        'last': 'Pink',
      },
      {
        '_id': 'person-10',
        'age': 100,
        'last': 'Pink'
      }
    ]);

    const driver_removed_offset = await controller.aggregate(MdbPerson, [
        {$match: {lastName: 'Pink'}},
        {
          $project: {
            last: '$lastName',
            age: '$age'
          }
        },
      ],
      {sort: {age: 'desc'}, offset: 0, limit: 1});
    expect(driver_removed_offset).to.deep.eq([
      {
        '_id': 'person-30',
        'age': 300,
        'last': 'Pink',
      }
    ]);
    const driver_removed_offset_rest = await controller.aggregate(MdbPerson, [
        {$match: {lastName: 'Pink'}},
        {
          $project: {
            last: '$lastName',
            age: '$age'
          }
        },
      ],
      {sort: {age: 'desc'}, offset: 1, limit: 2});
    expect(driver_removed_offset_rest).to.deep.eq([
      {
        '_id': 'person-20',
        'age': 200,
        'last': 'Pink',
      },
      {
        '_id': 'person-10',
        'age': 100,
        'last': 'Pink'
      }
    ]);
  }

}

