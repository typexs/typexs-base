import * as _ from 'lodash';
import * as path from 'path';
import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';

import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from 'commons-config';
import {XS_P_$COUNT} from '../../../src';
import {TestHelper} from '../TestHelper';

let bootstrap: Bootstrap;

@suite('functional/storage/controller_sql')
class StorageControllerSqlSpec {


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
    const Car = require('./fake_app_sql/entities/Car').Car;
    const Driver = require('./fake_app_sql/entities/Driver').Driver;

    const appdir = path.join(__dirname, 'fake_app_sql');
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
    storageRef.addEntityType(Car);
    storageRef.addEntityType(Driver);


    const controller = storageRef.getController();

    const car1 = new Driver();
    car1.firstName = 'Black';
    car1.lastName = 'Yellow';

    const car2 = new Driver();
    car2.firstName = 'Red';
    car2.lastName = 'Green';

    const car3 = new Driver();
    car3.firstName = 'Blue';
    car3.lastName = 'Pink';

    const driver_save_res = await controller.save([car1, car2, car3]);

    expect(driver_save_res).to.deep.eq(
      [{
        firstName: 'Black',
        lastName: 'Yellow',
        '$state': {isValidated: true, isSuccessValidated: true},
        id: 1
      },
        {
          firstName: 'Red',
          lastName: 'Green',
          '$state': {isValidated: true, isSuccessValidated: true},
          id: 2
        }, {
        '$state': {
          'isSuccessValidated': true,
          'isValidated': true
        },
        'firstName': 'Blue',
        'id': 3,
        'lastName': 'Pink'
      }]
    );

    const car = new Car();
    car.name = 'Team Blue';
    car.driver = [car1, car2];

    const car_ = new Car();
    car_.name = 'Team Yellow';
    car_.driver = [car3];

    const car_save_res = await controller.save(car);
    expect(car_save_res).to.deep.include({
      name: 'Team Blue',
      id: 1
    });
    expect(car_save_res.driver).to.have.length(2);

    const car_save_res2 = await controller.save(car_);
    expect(car_save_res2).to.deep.include({
      name: 'Team Yellow',
      id: 2
    });
    expect(car_save_res2.driver).to.have.length(1);

    const car_found_all = await controller.find(Car);
    expect(car_found_all).to.have.length(2);
    expect(car_found_all).to.deep.eq([{id: 1, name: 'Team Blue'},
      {id: 2, name: 'Team Yellow'}]);
    expect(car_found_all[0]).to.be.instanceOf(Car);

    const driver_found_all = await controller.find(Driver, null, {raw: true});
    // console.log(driver_found_all);
    expect(driver_found_all).to.deep.eq([
      {
        Driver_id: 1,
        Driver_firstName: 'Black',
        Driver_lastName: 'Yellow',
        Driver_carId: 1
      },
      {
        Driver_id: 2,
        Driver_firstName: 'Red',
        Driver_lastName: 'Green',
        Driver_carId: 1
      },
      {
        Driver_id: 3,
        Driver_firstName: 'Blue',
        Driver_lastName: 'Pink',
        Driver_carId: 2
      }]);

    const car_found = await controller.find(Car, {id: 1});

    expect(car_found).to.have.length(1);
    expect(car_found[XS_P_$COUNT]).to.be.eq(1);

    const car_found_raw = await controller.find(Car, {id: 2}, {raw: true});
    // console.log(car_found_raw);
    expect(car_found_raw).to.have.length(1);
    expect(car_found_raw[0]).to.deep.eq({Car_id: 2, Car_name: 'Team Yellow'});
    expect(car_found_raw[0]).to.be.not.instanceOf(Car);

    // search by string field
    const drivers_2 = await controller.find(Driver, {'firstName': 'Blue'});
    // console.log(car_by_driver);
    expect(drivers_2).to.have.length(1);
    expect(drivers_2[0]).to.deep.eq({id: 3, firstName: 'Blue', lastName: 'Pink'});

    let car_by_driver = await controller.find(Car, {'driver.id': 1});
    // console.log(car_by_driver);
    expect(car_by_driver).to.have.length(1);
    expect(car_by_driver[0]).to.deep.eq({id: 1, name: 'Team Blue'});

    car_by_driver = await controller.find(Car, {'driver.firstName': 'Black'});
    // console.log(car_by_driver);
    expect(car_by_driver).to.have.length(1);
    expect(car_by_driver[0]).to.deep.eq({id: 1, name: 'Team Blue'});

    const car_by_driver_inv = await controller.find(Driver, {'car.id': 1});
    // console.log(car_by_driver_inv);
    expect(car_by_driver_inv).to.have.length(2);
    expect(car_by_driver_inv[0]).to.deep.eq({id: 1, firstName: 'Black', lastName: 'Yellow'});
    expect(car_by_driver_inv[1]).to.deep.eq({id: 2, firstName: 'Red', lastName: 'Green'});

    // remove driver
    const remove_driver = await controller.remove(car_by_driver_inv);
    expect(remove_driver).to.have.length(2);
    expect(_.map(remove_driver, (d: any) => d.id)).to.deep.eq([undefined, undefined]);

    const car_by_driver_inv_after_remove = await controller.find(Driver, {'car.id': 1});
    expect(car_by_driver_inv_after_remove).to.have.length(0);

    const remove_car = await controller.remove(car_by_driver);
    expect(remove_car).to.have.length(1);
    expect(_.map(remove_car, (d: any) => d.id)).to.deep.eq([undefined]);

  }


}

