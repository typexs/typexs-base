import * as path from 'path';
import * as _ from 'lodash';
import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';

import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from 'commons-config';
// import {MdbCar} from "./fake_app_mongo/entities/MdbCar";
// import {MdbDriver} from "./fake_app_mongo/entities/MdbDriver";
import {TestHelper} from '../TestHelper';

let bootstrap: Bootstrap;


@suite('functional/storage/controller_mongo')
class StorageControllerMongoSpec {


  before() {
    // TestHelper.typeOrmReset();
    Bootstrap.reset();
    Config.clear();
  }


  async after() {
    if (bootstrap) {
      await bootstrap.shutdown();
    }
  }

  @test
  async 'lifecycle save, find, remove'() {
    const MdbCar = require('./fake_app_mongo/entities/MdbCar').MdbCar;
    const MdbDriver = require('./fake_app_mongo/entities/MdbDriver').MdbDriver;

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
    const storageRef = storageManager.get();
    storageRef.addEntityType(MdbCar);
    storageRef.addEntityType(MdbDriver);

    const c = await storageRef.connect();
    await c.manager.getMongoRepository(MdbCar).deleteMany({});
    await c.manager.getMongoRepository(MdbDriver).deleteMany({});
    await c.close();


    const controller = storageRef.getController();
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


    const remove_car = await controller.remove(car_by_driver);
    expect(remove_car).to.have.length(1);
    expect(_.map(remove_car, (d: any) => d.id)).to.deep.eq([undefined]);

    const car_by_driver_empty = await controller.find(MdbCar, {'driver.id': car1.id});
    expect(car_by_driver_empty).to.have.length(0);


  }


}

