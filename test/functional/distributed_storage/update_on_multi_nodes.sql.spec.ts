import {expect} from 'chai';
import {suite, test} from '@testdeck/mocha';
import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from '@allgemein/config';
import {TEST_STORAGE_OPTIONS} from '../config';
import {IEventBusConfiguration} from 'commons-eventbus';
import {TestHelper} from '../TestHelper';

import {DistributedStorageEntityController} from '../../../src/libs/distributed_storage/DistributedStorageEntityController';
import {ITypexsOptions} from '../../../src/libs/ITypexsOptions';
import {DataRow} from './fake_app_mongo/entities/DataRow';
import {IEntityController} from '../../../src/libs/storage/IEntityController';
import {Injector} from '../../../src/libs/di/Injector';
import {C_STORAGE_DEFAULT} from '../../../src/libs/Constants';
import {StorageRef} from '../../../src/libs/storage/StorageRef';
import {SpawnHandle} from '../SpawnHandle';
import {generateSqlDataRows} from './helper';


const LOG_EVENT = TestHelper.logEnable(false);
let bootstrap: Bootstrap;
let controllerRef: IEntityController;
const p: SpawnHandle[] = [];

@suite('functional/distributed_storage/update_on_multi_nodes')
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

    await storageRef.getController().save(entries);


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
  async 'update single entity'() {
    const controller = Injector.get(DistributedStorageEntityController);
    const results = await controller.update(DataRow, {id: 10}, {$set: {someString: 'Hallo welt'}});
    // console.log(results);
    // -2 means sqlite doesn't support affected rows info
    expect(results).to.be.deep.eq({remote01: -2, remote02: -2, system: -2});
    const entry = await controller.findOne(DataRow, {id: 10});
    expect(entry.someString).to.be.deep.eq('Hallo welt');
  }

  @test
  async 'update multiple entities'() {
    const controller = Injector.get(DistributedStorageEntityController);
    const results = await controller.update(DataRow, {someBool: false}, {$set: {someString: 'Hallo welt setted by update'}});
    // console.log(results);
    // -2 means sqlite doesn't support affected rows info
    expect(results).to.be.deep.eq({remote01: -2, remote02: -2, system: -2});
    const entry = await controller.findOne(DataRow, {someBool: false});
    expect(entry.someString).to.be.deep.eq('Hallo welt setted by update');
  }


  @test
  async 'update multiple entities on target id'() {
    const controller = Injector.get(DistributedStorageEntityController);
    const results = await controller.update(DataRow, {someBool: false},
      {$set: {someString: 'Hallo welt setted by update on remote01'}}, {targetIds: ['remote01']});
    // console.log(results);
    // -2 means sqlite doesn't support affected rows info
    expect(results).to.be.deep.eq({remote01: -2});
    const entry = await controller.findOne(DataRow, {someString: 'Hallo welt setted by update on remote01'});
    expect(entry.someString).to.be.deep.eq('Hallo welt setted by update on remote01');
  }


  @test
  async 'catch exception - wrong update query'() {
    const controller = Injector.get(DistributedStorageEntityController);
    try {
      const results = await controller.update(DataRow, {id: 10}, {$set: {some_String: 'Hallo welt'}});
      expect(false, 'exception not fired ...').to.be.eq(true);
    } catch (e) {
      expect(e.message.split('\n').sort()).to.be.deep.eq([
        'remote01: No entity column "some_String" was found.',
        'remote02: No entity column "some_String" was found.',
        'system: No entity column "some_String" was found.',
      ]);
    }
  }

  @test
  async 'catch exception - wrong condition query'() {
    const controller = Injector.get(DistributedStorageEntityController);
    try {
      const results = await controller.update(DataRow, {ids: 10}, {$set: {someString: 'Hallo welt'}});
      expect(false, 'exception not fired ...').to.be.eq(true);
    } catch (e) {
      expect(e.message.split('\n').sort()).to.be.deep.eq([
        'remote01: SQLITE_ERROR: no such column: ids',
        'remote02: SQLITE_ERROR: no such column: ids',
        'system: SQLITE_ERROR: no such column: ids',
      ]);
    }
  }

}

