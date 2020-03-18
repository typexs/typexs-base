import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';
import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from 'commons-config';
import {TEST_STORAGE_OPTIONS} from '../config';
import {IEventBusConfiguration} from 'commons-eventbus';
import {Container} from 'typedi';
import {TestHelper} from '../TestHelper';
import {SpawnHandle} from '../SpawnHandle';

import {DistributedStorageEntityController} from '../../../src/libs/distributed_storage/DistributedStorageEntityController';
import {ITypexsOptions} from '../../../src/libs/ITypexsOptions';
import {DataRow} from './fake_app/entities/DataRow';
import {__REMOTE_IDS__, XS_P_$ERRORED, XS_P_$SAVED} from '../../../src/libs/distributed_storage/Constants';


const LOG_EVENT = TestHelper.logEnable(false);

let bootstrap: Bootstrap;
let p: SpawnHandle;


@suite('functional/distributed_storage/save_remote_node')
class DistributedStorageSaveSpec {


  static async before() {
    Bootstrap.reset();
    Config.clear();

    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'system', path: __dirname + '/fake_app'},
        logging: {enable: LOG_EVENT, level: 'debug'},
        modules: {paths: [__dirname + '/../../..']},
        storage: {default: TEST_STORAGE_OPTIONS},
        eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}},
        // workers: {access: [{name: 'DistributedQueryWorker', access: 'allow'}]}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();

    p = SpawnHandle.do(__dirname + '/fake_app/node.ts').start(LOG_EVENT);
    await p.started;
  }

  static async after() {
    if (bootstrap) {
      await bootstrap.shutdown();
      p.shutdown();
      await p.done;
    }
  }


  @test
  async 'save new entry on remote node'() {

    const controller = Container.get(DistributedStorageEntityController);

    const testEntry = new DataRow();
    testEntry.someString = 'someString';
    testEntry.someNumber = 123;
    testEntry.someBool = true;
    testEntry.someDate = new Date();
    testEntry.someAny = JSON.stringify({hallo: 'welt'});


    const saved = await controller.save(testEntry);
    const results = await controller.find(DataRow);


    expect(saved[XS_P_$SAVED]).to.be.eq(1);
    expect(saved[XS_P_$ERRORED]).to.be.eq(0);
    expect(saved[0][__REMOTE_IDS__]).to.be.deep.eq({fakeapp01: {id: 1}});
    expect(results).to.have.length(1);
    expect(results[0]).to.be.instanceOf(DataRow);

  }

  @test.skip
  async 'execute save for new entry on remote node (remote exception handling)'() {

  }

}

