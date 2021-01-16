import {expect} from 'chai';
import {suite, test} from '@testdeck/mocha';
import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from '@allgemein/config';
import {TEST_STORAGE_OPTIONS} from '../config';
import {IEventBusConfiguration} from 'commons-eventbus';
import {TestHelper} from '../TestHelper';

import {DistributedStorageEntityController} from '../../../src/libs/distributed_storage/DistributedStorageEntityController';
import {ITypexsOptions} from '../../../src/libs/ITypexsOptions';
import {IEntityController} from '../../../src/libs/storage/IEntityController';
import {DataRow} from './fake_app/entities/DataRow';
import {Injector} from '../../../src/libs/di/Injector';
import {C_STORAGE_DEFAULT} from '../../../src/libs/Constants';
import {StorageRef} from '../../../src/libs/storage/StorageRef';
import {SpawnHandle} from '../SpawnHandle';
import {generateSqlDataRows} from './helper';


const LOG_EVENT = TestHelper.logEnable(false);
let bootstrap: Bootstrap;
let controllerRef: IEntityController;
const p: SpawnHandle[] = [];

@suite('functional/distributed_storage/remove_on_multi_nodes')
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
        modules: {paths: [__dirname + '/../../..'], disableCache: true},
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
    const entries = generateSqlDataRows();
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
  async 'remove single entity'() {
    const entry = await controllerRef.find(DataRow, {id: 10}, {limit: 10});
    const controller = Injector.get(DistributedStorageEntityController) as IEntityController;
    const results = await controller.remove(entry);
    expect(results).to.be.deep.eq({remote02: 1, remote01: 1, system: 1});
  }


  @test
  async 'remove by conditions'() {
    const controller = Injector.get(DistributedStorageEntityController) as IEntityController;
    const results = await controller.remove(DataRow, {someBool: false});
    // is not supported
    expect(results).to.be.deep.eq({remote01: -2, remote02: -2, system: -2});

    const entries = await controller.find(DataRow, {someBool: false}, {limit: 50});
    expect(entries).to.have.length(0);
  }


  @test
  async 'remove by conditions - on explicit target id'() {
    const controller = Injector.get(DistributedStorageEntityController);
    let entries = await controller.find(DataRow, {id: {$in: [14, 16]}}, {limit: 50});
    expect(entries).to.have.length(6);

    const results = await controller.remove(DataRow, {id: {$in: [14, 16]}}, {targetIds: ['remote01']});
    // is not supported
    expect(results).to.be.deep.eq({remote01: -2});

    entries = await controller.find(DataRow, {id: {$in: [14, 16]}}, {limit: 50});
    expect(entries).to.have.length(4);
  }


  @test
  async 'catch exception - wrong conditions'() {
    const controller = Injector.get(DistributedStorageEntityController);
    try {
      const results = await controller.remove(DataRow, {some_Bool: false});
      expect(false, 'exception not fired ...').to.be.eq(true);
    } catch (e) {
      expect(e.message.split('\n').sort()).to.be.deep.eq([
        'remote01: SQLITE_ERROR: no such column: some_Bool',
        'remote02: SQLITE_ERROR: no such column: some_Bool',
        'system: SQLITE_ERROR: no such column: some_Bool',
      ]);
    }
  }

}

