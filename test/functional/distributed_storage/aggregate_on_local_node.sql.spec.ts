import {expect} from 'chai';
import {suite, test} from 'mocha-typescript';
import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from 'commons-config';
import {TEST_MONGO_STORAGE_OPTIONS, TEST_STORAGE_OPTIONS} from '../config';
import {IEventBusConfiguration} from 'commons-eventbus';
import {Container} from 'typedi';
import {TestHelper} from '../TestHelper';
import {SpawnHandle} from '../SpawnHandle';

import {DistributedStorageEntityController} from '../../../src/libs/distributed_storage/DistributedStorageEntityController';
import {ITypexsOptions} from '../../../src/libs/ITypexsOptions';
import {DataRow} from './fake_app_mongo/entities/DataRow';
import * as _ from 'lodash';
import {__NODE_ID__} from '../../../src/libs/distributed_storage/Constants';
import {Injector} from '../../../src/libs/di/Injector';
import {C_STORAGE_DEFAULT} from '../../../src/libs/Constants';
import {StorageRef} from '../../../src/libs/storage/StorageRef';


const LOG_EVENT = TestHelper.logEnable(false);

let bootstrap: Bootstrap;
// let p: SpawnHandle;


@suite('functional/distributed_storage/aggregate_on_local_node (sql)')
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
  async 'local'() {

    const controller = Container.get(DistributedStorageEntityController);

    const results = await controller.aggregate(DataRow, [{$match: {someBool: true}}]);

    // console.log(results);
    const evenIds = results.map(x => {
      return x.id;
    });

    expect(evenIds).to.be.deep.eq(_.range(1, 11).map(x => x * 2));
    const nodeIds = _.uniq(results.map(x => {
      return x[__NODE_ID__];
    }));
    expect(nodeIds).to.be.deep.eq(['system']);


  }

}

