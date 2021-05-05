import * as _ from 'lodash';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from '@allgemein/config';
import {TEST_STORAGE_OPTIONS} from '../config';
import {IEventBusConfiguration} from 'commons-eventbus';
import {Container} from 'typedi';
import {TestHelper} from '../TestHelper';
import {SpawnHandle} from '../SpawnHandle';

import {DistributedStorageEntityController} from '../../../src/libs/distributed_storage/DistributedStorageEntityController';
import {ITypexsOptions} from '../../../src/libs/ITypexsOptions';
import {DataRow} from './fake_app/entities/DataRow';
import {__REMOTE_IDS__, XS_P_$ERRORED, XS_P_$SAVED} from '../../../src/libs/distributed_storage/Constants';
import {IEntityController} from '../../../src/libs/storage/IEntityController';
import {generateSqlDataRows} from './helper';
import {Injector} from '../../../src/libs/di/Injector';
import {StorageRef} from '../../../src/libs/storage/StorageRef';
import {__NODE_ID__, __REGISTRY__, C_STORAGE_DEFAULT} from '../../../src/libs/Constants';
import {__CLASS__} from '@allgemein/schema-api';

// process.env.SQL_LOG = '1';


const LOG_EVENT = TestHelper.logEnable(false);
let bootstrap: Bootstrap;
let controllerRef: IEntityController;
const p: SpawnHandle[] = [];

@suite('functional/distributed_storage/save_on_multi_nodes')
class DistributedStorageSaveSpec {


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

    p[0] = SpawnHandle.do(__dirname + '/fake_app/node.ts').nodeId('remote01').start(LOG_EVENT);
    await p[0].started;

    p[1] = SpawnHandle.do(__dirname + '/fake_app/node.ts').nodeId('remote02').start(LOG_EVENT);
    await p[1].started;

    await TestHelper.wait(500);
  }

  static async after() {
    if (bootstrap) {
      await bootstrap.shutdown();

      if (p.length > 0) {
        p.map(x => x.shutdown());
        await Promise.all(p.map(x => x.done));
      }
    }
  }


  @test
  async 'save new entry'() {

    const controller = Container.get(DistributedStorageEntityController);

    const testEntry = new DataRow();
    testEntry.someString = 'someString';
    testEntry.someNumber = 123;
    testEntry.someBool = true;
    testEntry.someDate = new Date();
    testEntry.someAny = JSON.stringify({hallo: 'welt'});

    const saved = await controller.save(testEntry);
    const results = await controller.find(DataRow, {});

    expect(saved).to.have.length(1);
    expect(saved[XS_P_$SAVED]).to.be.eq(3);
    expect(saved[XS_P_$ERRORED]).to.be.eq(0);
    expect(saved[0][__REMOTE_IDS__]).to.be.deep.eq({
      remote01: {id: 21},
      remote02: {id: 21},
      system: {id: 21}
    });
    expect(results).to.have.length(63);
    expect(results[0]).to.be.instanceOf(DataRow);

  }


  @test
  async 'save new entries'() {
    const controller = Container.get(DistributedStorageEntityController);

    const toSave = [];
    for (let i = 0; i < 10; i++) {
      const testEntry = new DataRow();
      testEntry.someString = 'saveMany';
      testEntry.someNumber = 12345;
      testEntry.someBool = i % 2 === 0;
      testEntry.someDate = new Date(2020, i, 1);
      testEntry.someAny = '';
      toSave.push(testEntry);
    }

    const saved = await controller.save(toSave);
    const results = await controller.find(DataRow, {someString: 'saveMany'});

    expect(saved).to.have.length(10);
    expect(saved[XS_P_$SAVED]).to.be.eq(30);
    expect(saved[XS_P_$ERRORED]).to.be.eq(0);
    expect(saved[0][__REMOTE_IDS__].remote01.id).to.be.gt(20);

    expect(results).to.have.length(30);
    expect(results[0]).to.be.instanceOf(DataRow);
  }


  @test
  async 'save edited entry'() {
    const controller = Container.get(DistributedStorageEntityController);
    const results = await controller.find(DataRow, {id: 10});
    expect(results).to.have.length(3);
    expect(results[0]).to.be.instanceOf(DataRow);

    const testEntry = _.first(results);
    testEntry.someString = 'editedString';
    testEntry.someNumber = 321;
    testEntry.someBool = true;
    testEntry.someDate = new Date();
    testEntry.someAny = JSON.stringify({hallo: 'editedWelt'});

    const saved = await controller.save(testEntry);

    expect(saved).to.have.length(1);
    expect(saved[XS_P_$SAVED]).to.be.eq(3);
    expect(saved[XS_P_$ERRORED]).to.be.eq(0);
    expect(saved[0][__REMOTE_IDS__]).to.be.deep.eq({remote01: {id: 10}, remote02: {id: 10}, system: {id: 10}});

    const results2 = await controller.find(DataRow, {id: 10});
    expect(results2).to.have.length(3);
    const entry = results2.find(x => x[__NODE_ID__] === 'system');
    expect(entry).to.be.deep.eq({
      [__NODE_ID__]: 'system',
      [__CLASS__]: 'DataRow',
      [__REGISTRY__]: 'typeorm',

      'id': 10,
      'someAny': '{"hallo":"editedWelt"}',
      'someBool': true,
      'someDate': testEntry.someDate,
      'someFlag': '10',
      'someNumber': 321,
      'someString': 'editedString'
    });
  }


  @test
  async 'save edited entries'() {
    const controller = Container.get(DistributedStorageEntityController);
    const results = await controller.find(DataRow, {someBool: false, id: {$le: 20}});
    expect(results).to.have.length(30);
    results.map(x => expect(x).to.be.instanceOf(DataRow));

    results.forEach((x, index) => {
      x.someString = 'editedStringMulti';
      x.someNumber = 456;
      x.someDate = new Date(2020, 1, index);
    });

    const saved = await controller.save(results);

    expect(saved).to.have.length(30);
    expect(saved[XS_P_$SAVED]).to.be.eq(90);
    expect(saved[XS_P_$ERRORED]).to.be.eq(0);
    expect(saved[0][__REMOTE_IDS__]).to.be.deep.eq({remote01: {id: 1}, remote02: {id: 1}, system: {id: 1}});

    const results2 = await controller.find(DataRow, {someBool: false, id: {$le: 20}});
    expect(results2).to.have.length(30);
    const entry = results2.find(x => x[__NODE_ID__] === 'remote01');
    expect(entry).to.be.deep.include({
      [__NODE_ID__]: 'remote01',
      [__CLASS__]: 'DataRow',
      [__REGISTRY__]: 'typeorm',

      'id': 1,
      'someBool': false,
      'someNumber': 456,
      'someString': 'editedStringMulti'
    });

    results2.forEach((value, index) => {
      expect(value.someString).to.be.eq('editedStringMulti');
    });

  }


  @test
  async 'save new entries on target id'() {
    const controller = Container.get(DistributedStorageEntityController);

    const toSave = [];
    for (let i = 0; i < 10; i++) {
      const testEntry = new DataRow();
      testEntry.someString = 'saveManyOnTarget';
      testEntry.someNumber = 1543212345;
      testEntry.someBool = i % 2 === 0;
      testEntry.someDate = new Date(2020, i, 1);
      testEntry.someAny = 'Remote01';
      toSave.push(testEntry);
    }

    const saved = await controller.save(toSave, {targetIds: ['remote01']});
    const results = await controller.find(DataRow, {someString: 'saveManyOnTarget'});

    expect(saved).to.have.length(10);
    expect(saved[XS_P_$SAVED]).to.be.eq(10);
    expect(saved[XS_P_$ERRORED]).to.be.eq(0);
    expect(saved[0][__REMOTE_IDS__].remote01.id).to.be.gt(10);

    expect(results).to.have.length(10);
    expect(_.uniq(results.map(x => x[__NODE_ID__]))).to.be.deep.eq(['remote01']);
    expect(results[0]).to.be.instanceOf(DataRow);
  }


  @test
  async 'catch exceptions - on not existing class'() {
    const controller = Container.get(DistributedStorageEntityController);
    const dummy = {
      some: 'data',
      save: 'now'
    };

    try {
      const results = await controller.save(dummy);
      expect(false, 'exception not fired ...').to.be.eq(true);
    } catch (e) {
      expect(e.message.split('\n').sort()).to.be.deep.eq([
        'remote01: no entity controller defined to handle type "Object"',
        'remote02: no entity controller defined to handle type "Object"',
        'system: no entity controller defined to handle type "Object"',
      ]);
    }

  }


  @test
  async 'catch exceptions - on not existing class array'() {
    const controller = Container.get(DistributedStorageEntityController);
    const dummy: any[] = [{
      some: 'data',
      save: 'now'
    }, {
      some: 'data2',
      save: 'now3',
      failing: 'asd'
    }];

    try {
      const results = await controller.save(dummy);
      expect(false, 'exception not fired ...').to.be.eq(true);
    } catch (e) {
      expect(e.message.split('\n').sort()).to.be.deep.eq([
        'remote01: no entity controller defined to handle type "Object"',
        'remote02: no entity controller defined to handle type "Object"',
        'system: no entity controller defined to handle type "Object"',
      ]);
    }

  }


}

