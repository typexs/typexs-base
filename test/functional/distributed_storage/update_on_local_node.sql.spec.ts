import {expect} from 'chai';
import {suite, test} from 'mocha-typescript';
import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from 'commons-config';
import {TEST_STORAGE_OPTIONS} from '../config';
import {IEventBusConfiguration} from 'commons-eventbus';
import {Container} from 'typedi';
import {TestHelper} from '../TestHelper';

import {DistributedStorageEntityController} from '../../../src/libs/distributed_storage/DistributedStorageEntityController';
import {ITypexsOptions} from '../../../src/libs/ITypexsOptions';
import {DataRow} from './fake_app_mongo/entities/DataRow';
import {IEntityController} from '../../../src/libs/storage/IEntityController';
import {Injector} from '../../../src/libs/di/Injector';
import {C_STORAGE_DEFAULT} from '../../../src/libs/Constants';
import {StorageRef} from '../../../src/libs/storage/StorageRef';


const LOG_EVENT = TestHelper.logEnable(false);

let bootstrap: Bootstrap;
// let p: SpawnHandle;
let controllerRef: IEntityController;

@suite('functional/distributed_storage/update_on_single_node')
class DistributedStorageSaveSpec {


  static async before() {
    Bootstrap.reset();
    Config.clear();
    const DB_OPTIONS = TEST_STORAGE_OPTIONS;
    // _.set(DB_OPTIONS, 'database', 'typexs_local');
    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'system', path: __dirname + '/fake_app'},
        logging: {enable: LOG_EVENT, level: 'debug'},
        modules: {paths: [__dirname + '/../../..']},
        storage: {default: DB_OPTIONS},
        eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}},
        workers: {access: [{name: 'DistributedQueryWorker', access: 'allow'}]}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();

    const storageRef = Injector.get(C_STORAGE_DEFAULT) as StorageRef;
    controllerRef = storageRef.getController();

    const entries = [];
    for (let i = 1; i <= 20; i++) {
      const e = new DataRow();
      e.id = i;
      e.someBool = i % 2 === 0;
      e.someDate = new Date(2020, i % 12, i % 30);
      e.someNumber = i * 10;
      e.someString = 'test ' + i;
      e.someAny = ['test ' + i, 'test ' + (i * 2)];
      entries.push(e);
    }

    await storageRef.getController().save(entries);
  }

  static async after() {
    if (bootstrap) {
      await bootstrap.shutdown();
    }
  }


  @test
  async 'update single entity'() {

    const controller = Container.get(DistributedStorageEntityController) as IEntityController;
    const results = await controller.update(DataRow, {id: 10}, {$set: {someString: 'Hallo welt'}});
    // console.log(results);
    // -2 means sqlite doesn't support affected rows info
    expect(results).to.be.deep.eq({system: -2});
    const entry = await controllerRef.findOne(DataRow, {id: 10});
    expect(entry.someString).to.be.deep.eq('Hallo welt');
  }

}

