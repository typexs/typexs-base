import * as path from "path";
import * as _ from 'lodash';
import {suite, test} from "mocha-typescript";
import {expect} from "chai";

import {Bootstrap} from "../../../src/Bootstrap";
import {Config} from "commons-config";
//import {Car} from "./fake_app_mongo/entities/Car";
//import {Driver} from "./fake_app_mongo/entities/Driver";
import {inspect} from "util";
import {PlatformTools} from "typeorm/platform/PlatformTools";


@suite('functional/storage/storage_controller_mongo')
class Storage_controller_mongoSpec {


  before() {
    PlatformTools.getGlobalVariable().typeormMetadataArgsStorage = null;
    Bootstrap.reset();
    Config.clear();
  }


  @test
  async 'lifecycle save, find, remove'() {
    const Car = require('./fake_app_mongo/entities/Car').Car;
    const Driver = require('./fake_app_mongo/entities/Driver').Driver;

    let appdir = path.join(__dirname, 'fake_app_mongo');
    let bootstrap = await Bootstrap
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
    storageRef.addEntityType(Car);
    storageRef.addEntityType(Driver);

    let c = await storageRef.connect();
    await c.manager.getMongoRepository(Car).deleteMany({});
    await c.manager.getMongoRepository(Driver).deleteMany({});
    await c.close()


    let controller = storageRef.getController();
    let inc = 0;
    let car1 = new Driver();
    car1.firstName = 'Black';
    car1.lastName = 'Yellow';
    car1.id = 'rec-' + (inc++);

    let car2 = new Driver();
    car2.firstName = 'Red';
    car2.lastName = 'Green';
    car2.id = 'rec-' + (inc++);

    let car3 = new Driver();
    car3.firstName = 'Blue';
    car3.lastName = 'Pink';
    car3.id = 'rec-' + (inc++);

    let car4 = new Driver();
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

    let car = new Car();
    car.name = 'Team Blue';
    car.driver = [car1, car2];
    car.id = 'rec-' + (inc++);

    let car_ = new Car();
    car_.name = 'Team Yellow';
    car_.driver = [car3];
    car_.id = 'rec-' + (inc++);

    let car_save_res = await controller.save(car);
    expect(car_save_res).to.deep.include({
      name: 'Team Blue',
      id: "rec-4"
    })
    expect(car_save_res.driver).to.have.length(2);

    let car_save_res2 = await controller.save(car_);
    expect(car_save_res2).to.deep.include({
      name: 'Team Yellow',
      id: "rec-5"
    })
    expect(car_save_res2.driver).to.have.length(1);

    let car_found_all = await controller.find(Car);

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
    expect(car_found_all[0]).to.be.instanceOf(Car);

    let driver_found_all = await controller.find(Driver, null, {raw: true});
    //console.log(driver_found_all);
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

    let car_found = await controller.find(Car, {id: car.id});
    expect(car_found).to.have.length(1);

    let car_found_raw = await controller.find(Car, {id: car_.id}, {raw: true});
    //console.log(inspect(car_found_raw, null, 10));
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
    expect(car_found_raw[0]).to.be.not.instanceOf(Car);

    let car_by_driver = await controller.find(Car, {'driver.id': car1.id});
    //console.log(inspect(car_by_driver, false, 10));
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


    let remove_car = await controller.remove(car_by_driver);
    expect(remove_car).to.have.length(1);
    expect(_.map(remove_car,(d:any) => d.id)).to.deep.eq([undefined]);

    let car_by_driver_empty = await controller.find(Car, {'driver.id': car1.id});
    expect(car_by_driver_empty).to.have.length(0);


  }


}

