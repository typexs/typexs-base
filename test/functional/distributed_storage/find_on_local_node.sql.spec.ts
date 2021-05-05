import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from '@allgemein/config';
import {TEST_STORAGE_OPTIONS} from '../config';
import {IEventBusConfiguration} from 'commons-eventbus';
import {Container} from 'typedi';
import {TestHelper} from '../TestHelper';

import {DistributedStorageEntityController} from '../../../src/libs/distributed_storage/DistributedStorageEntityController';
import {DistributedQueryWorker} from '../../../src/workers/DistributedQueryWorker';
import {ITypexsOptions} from '../../../src/libs/ITypexsOptions';
import {DataRow} from './fake_app/entities/DataRow';
import {IEntityController} from '../../../src/libs/storage/IEntityController';
import {generateSqlDataRows} from './helper';
import {__NODE_ID__, __REGISTRY__, C_STORAGE_DEFAULT, XS_P_$COUNT} from '../../../src/libs/Constants';
import {StorageRef} from '../../../src/libs/storage/StorageRef';
import {Injector} from '../../../src/libs/di/Injector';
import {__CLASS__} from '@allgemein/schema-api';


const LOG_EVENT = TestHelper.logEnable(false);

let bootstrap: Bootstrap;
let controllerRef: IEntityController;


@suite('functional/distributed/find_on_local (sql)')
class DistributedQuerySpec {


  static async before() {
    Bootstrap.reset();
    Config.clear();

    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'system', path: __dirname + '/fake_app'},
        logging: {enable: LOG_EVENT, level: 'debug'},
        modules: {paths: [__dirname + '/../../..'], disableCache: true},
        storage: {default: TEST_STORAGE_OPTIONS},
        eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}},
        // CONFIG ADDED
        workers: {access: [{name: 'DistributedQueryWorker', access: 'allow'}]}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();
    const entries = generateSqlDataRows();

    const storageRef = Injector.get(C_STORAGE_DEFAULT) as StorageRef;
    controllerRef = storageRef.getController();
    await controllerRef.save(entries);

  }


  static async after() {
    if (bootstrap) {
      await bootstrap.shutdown();
    }
  }


  @test
  async 'findOne single entity'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entity = await controller.findOne(DataRow, {id: 10});
    // console.log(entity);
    expect(entity).to.deep.include({
      id: 10,
      someNumber: 100,
      someString: 'test 10',
      someBool: true,
      [__CLASS__]: 'DataRow',
      [__REGISTRY__]: 'typeorm'
    });
  }

  @test
  async 'find single entity with limit'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entities = await controller.find(DataRow, {id: 10}, {limit: 1});
    // console.log(entity);
    expect(entities).to.have.length(1);
    expect(entities[XS_P_$COUNT]).to.be.eq(1);
    expect(entities.shift()).to.deep.include({
      id: 10,
      someNumber: 100,
      someString: 'test 10',
      someBool: true,
      [__CLASS__]: 'DataRow',
      [__REGISTRY__]: 'typeorm'
    });
  }


  @test
  async 'findOne empty'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entity = await controller.findOne(DataRow, {id: 100});
    expect(entity).to.be.null;
  }


  @test
  async 'find multiple entries'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entities = await controller.find(DataRow, {someBool: true});
    expect(entities).to.have.length(10);
  }

  @test
  async 'find multiple entries by Date'() {
    const date = new Date(2020, 6, 10);
    const controller = Container.get(DistributedStorageEntityController);
    const entities = await controller.find(DataRow, {someDate: {$ge: date}});
    expect(entities).to.not.be.null;
    expect(entities).to.have.length(8);
    entities.forEach(e => {
      expect(e.someDate).to.be.gte(date);
    });

  }


  @test
  async 'catch exceptions - wrong search query'() {
    const controller = Container.get(DistributedStorageEntityController);
    try {
      const results = await controller.find(DataRow, {some_body: false, id: {$le: 20}});
      expect(false, 'exception not fired ...').to.be.eq(true);
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.be.eq('system: condition property "some_body" is not definied');
    }

  }


}

