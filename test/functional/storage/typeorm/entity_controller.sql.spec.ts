import * as path from 'path';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {Bootstrap} from '../../../../src/Bootstrap';
import {Config} from '@allgemein/config';
import {ClassType} from '@allgemein/schema-api';
import {XS_P_$COUNT} from '../../../../src/libs/Constants';
import {TypeOrmStorageRef} from '../../../../src/libs/storage/framework/typeorm/TypeOrmStorageRef';
import {IEntityController} from '../../../../src/libs/storage/IEntityController';

let bootstrap: Bootstrap;
let storageRef: TypeOrmStorageRef;

let CarSql: ClassType<any> = null;
let DriverSql: ClassType<any> = null;
let CarParam: ClassType<any> = null;
let ObjectWithJson: ClassType<any> = null;
let controller: IEntityController = null;


@suite('functional/storage/typeorm/entity_controller.sql')
class StorageControllerSqlSpec {


  async before() {
    // TestHelper.typeOrmReset();
    Bootstrap.reset();
    Config.clear();

    CarSql = require('./apps/sql/entities/CarSql').CarSql;
    DriverSql = require('./apps/sql/entities/DriverSql').DriverSql;
    CarParam = require('./apps/sql/entities/CarParam').CarParam;
    ObjectWithJson = require('./apps/sql/entities/ObjectWithJson').ObjectWithJson;

    const appdir = path.join(__dirname, 'apps/sql');
    bootstrap = await Bootstrap
      .configure({
        app: {
          path: appdir
        },
        modules: {
          paths: [__dirname + '/../../../..']
        }
      })
      .prepareRuntime();

    bootstrap = await bootstrap.activateStorage();

    const storageManager = bootstrap.getStorage();
    storageRef = storageManager.get();
    storageRef.addEntityType(CarSql);
    storageRef.addEntityType(DriverSql);
    controller = storageRef.getController();


  }


  async after() {
    if (bootstrap) {
      await bootstrap.shutdown();
      await bootstrap.getStorage().shutdown();
    }
  }

  @test
  async 'lifecycle save, find, remove'() {


    const car1 = new DriverSql();
    car1.firstName = 'Black';
    car1.lastName = 'Yellow';

    const car2 = new DriverSql();
    car2.firstName = 'Red';
    car2.lastName = 'Green';

    const car3 = new DriverSql();
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

    const car = new CarSql();
    car.name = 'Team Blue';
    car.driver = [car1, car2];

    const car_ = new CarSql();
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

    const car_found_all = await controller.find(CarSql);
    expect(car_found_all).to.have.length(2);
    expect(car_found_all).to.deep.eq([{id: 1, name: 'Team Blue'},
      {id: 2, name: 'Team Yellow'}]);
    expect(car_found_all[0]).to.be.instanceOf(CarSql);

    const driver_found_all = await controller.find(DriverSql, null, {raw: true});
    // console.log(driver_found_all);
    expect(driver_found_all).to.deep.eq([
      {
        DriverSql_id: 1,
        DriverSql_firstName: 'Black',
        DriverSql_lastName: 'Yellow',
        DriverSql_carId: 1
      },
      {
        DriverSql_id: 2,
        DriverSql_firstName: 'Red',
        DriverSql_lastName: 'Green',
        DriverSql_carId: 1
      },
      {
        DriverSql_id: 3,
        DriverSql_firstName: 'Blue',
        DriverSql_lastName: 'Pink',
        DriverSql_carId: 2
      }]);

    const car_found = await controller.find(CarSql, {id: 1});

    expect(car_found).to.have.length(1);
    expect(car_found[XS_P_$COUNT]).to.be.eq(1);

    const car_found_raw = await controller.find(CarSql, {id: 2}, {raw: true});
    // console.log(car_found_raw);
    expect(car_found_raw).to.have.length(1);
    expect(car_found_raw[0]).to.deep.eq({CarSql_id: 2, CarSql_name: 'Team Yellow'});
    expect(car_found_raw[0]).to.be.not.instanceOf(CarSql);

    // search by string field
    const drivers_2 = await controller.find(DriverSql, {'firstName': 'Blue'});
    // console.log(car_by_driver);
    expect(drivers_2).to.have.length(1);
    expect(drivers_2[0]).to.deep.eq({id: 3, firstName: 'Blue', lastName: 'Pink'});

    let car_by_driver = await controller.find(CarSql, {'driver.id': 1});
    // console.log(car_by_driver);
    expect(car_by_driver).to.have.length(1);
    expect(car_by_driver[0]).to.deep.eq({id: 1, name: 'Team Blue'});

    car_by_driver = await controller.find(CarSql, {'driver.firstName': 'Black'});
    // console.log(car_by_driver);
    expect(car_by_driver).to.have.length(1);
    expect(car_by_driver[0]).to.deep.eq({id: 1, name: 'Team Blue'});

    const car_by_driver_inv = await controller.find(DriverSql, {'car.id': 1});
    // console.log(car_by_driver_inv);
    expect(car_by_driver_inv).to.have.length(2);
    expect(car_by_driver_inv[0]).to.deep.eq({id: 1, firstName: 'Black', lastName: 'Yellow'});
    expect(car_by_driver_inv[1]).to.deep.eq({id: 2, firstName: 'Red', lastName: 'Green'});

    // remove driver
    const remove_driver_count = await controller.remove(car_by_driver_inv);
    expect(remove_driver_count).to.be.eq(2);

    const car_by_driver_inv_after_remove = await controller.find(DriverSql, {'car.id': 1});
    expect(car_by_driver_inv_after_remove).to.have.length(0);

    const remove_car_count = await controller.remove(car_by_driver);
    expect(remove_car_count).to.be.eq(1);

  }


  @test
  async 'save and find object with property marked as stringify'() {
    const subObj = {hallo: 'welt', das: 'ist', ein: {objekt: '!'}};
    const obj = new ObjectWithJson();
    obj.firstName = 'JsonTest';
    obj.lastName = subObj;
    const savedObject = await controller.save(obj);
    delete savedObject['$state'];
    const foundObject = await controller.findOne(ObjectWithJson, {id: savedObject.id});
    expect(savedObject.lastName).to.be.deep.eq(subObj);
    expect(savedObject).to.be.deep.eq(foundObject);
    expect(foundObject.lastName).to.be.deep.eq(subObj);
  }


  @test
  async 'remove by conditions'() {
    const car1 = new DriverSql();
    car1.firstName = 'Black';
    car1.lastName = 'Yellow';

    const car2 = new DriverSql();
    car2.firstName = 'Blue';
    car2.lastName = 'Green';

    const car3 = new DriverSql();
    car3.firstName = 'Blue';
    car3.lastName = 'Pink';

    const driver_save_res = await controller.save([car1, car2, car3]);

    const driver_found = await controller.find(DriverSql);
    expect(driver_found).to.have.length(3);

    const driver_removed_count = await controller.remove(DriverSql, {firstName: 'Blue'});
    expect(driver_removed_count).to.not.eq(-1);

    const driver_found_rest = await controller.find(DriverSql);
    expect(driver_found_rest).to.have.length(1);


  }


  @test
  async 'update by conditions'() {
    const car1 = new DriverSql();
    car1.firstName = 'Green';
    car1.lastName = 'Yellow';

    const car2 = new DriverSql();
    car2.firstName = 'Blue';
    car2.lastName = 'Green';

    const car3 = new DriverSql();
    car3.firstName = 'Blue';
    car3.lastName = 'Pink';

    const driver_save_res = await controller.save([car1, car2, car3]);

    const driver_found = await controller.find(DriverSql);
    expect(driver_found).to.have.length(3);

    const driver_removed_count = await controller.update(DriverSql, {firstName: 'Blue'}, {$set: {firstName: 'Black'}});
    expect(driver_removed_count).to.not.eq(-1);

    const driver_found_rest = await controller.find(DriverSql, {firstName: 'Black'});
    expect(driver_found_rest).to.have.length(2);
  }


  // @test
  // async 'aggregate - pipeline'() {
  //   const param: any[] = [new CarParam(), new CarParam(), new CarParam(), new CarParam(), new CarParam()];
  //   param[0].doors = 4;
  //   param[0].maxSpeed = 100;
  //   param[0].ps = 140;
  //   param[0].year = 1979;
  //   param[1].doors = 2;
  //   param[1].maxSpeed = 120;
  //   param[1].ps = 180;
  //   param[1].year = 1979;
  //   param[2].doors = 2;
  //   param[2].maxSpeed = 200;
  //   param[2].ps = 280;
  //   param[2].year = 1980;
  //   param[3].doors = 3;
  //   param[3].maxSpeed = 140;
  //   param[3].ps = 130;
  //   param[3].year = 1985;
  //   param[4].doors = 3;
  //   param[4].maxSpeed = 170;
  //   param[4].ps = 130;
  //   param[4].year = 1989;
  //   await controller.save(param);
  //
  //   const aggr = await controller.aggregate(CarParam, [{$match: {doors: {$le: 2}}}]);
  //   expect(aggr).to.have.length(2);
  //   expect(aggr[XS_P_$COUNT]).to.have.length(2);
  //   expect(aggr.map(x => x.id)).to.be.deep.eq([2, 3]);
  //
  //
  //   console.log(aggr);
  // }


  @test.skip
  async 'exception handling - update'() {

  }

  @test.skip
  async 'exception handling - remove'() {

  }

  @test.skip
  async 'exception handling - find'() {

  }

  @test.skip
  async 'exception handling - save'() {

  }


}

