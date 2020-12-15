import {expect} from 'chai';
import {suite, test} from '@testdeck/mocha';
import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from 'commons-config';
import {TEST_STORAGE_OPTIONS} from '../config';
import {IEventBusConfiguration} from 'commons-eventbus';
import {Container} from 'typedi';
import {TestHelper} from '../TestHelper';

import {DistributedStorageEntityController} from '../../../src/libs/distributed_storage/DistributedStorageEntityController';
import {ITypexsOptions} from '../../../src/libs/ITypexsOptions';
import {DataRow} from './fake_app_mongo/entities/DataRow';
import * as _ from 'lodash';
import {__NODE_ID__} from '../../../src/libs/distributed_storage/Constants';
import {Injector} from '../../../src/libs/di/Injector';
import {C_STORAGE_DEFAULT} from '../../../src/libs/Constants';
import {StorageRef} from '../../../src/libs/storage/StorageRef';
import {generateSqlDataRows} from './helper';


const LOG_EVENT = TestHelper.logEnable(true);

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

    const entries = generateSqlDataRows();

    await storageRef.getController().save(entries);
  }

  static async after() {
    if (bootstrap) {
      await bootstrap.shutdown();
    }
  }


  @test
  async 'simple match aggregation'() {
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


  @test
  async 'match and group aggregation'() {
    const controller = Container.get(DistributedStorageEntityController);
    const results = await controller.aggregate(DataRow, [
      {$match: {someBool: true}},
      {$group: {_id: null, sum: {$sum: 1}}}
    ]) as any[];

    // console.log(results);
    expect(results).to.have.length(1);
    expect(results[0]).to.be.deep.eq({
      sum: 10,
      __nodeId__: 'system',
      '__class__': 'DataRow',
      '__registry__': 'typeorm'
    });

    const nodeIds = _.uniq(results.map(x => {
      return x[__NODE_ID__];
    }));
    expect(nodeIds).to.be.deep.eq(['system']);
  }


  @test
  async 'match and group by key aggregation'() {
    const controller = Container.get(DistributedStorageEntityController);
    let results = await controller.aggregate(DataRow, [
      {$match: {someBool: true}},
      {$group: {_id: 'someFlag', sum: {$sum: 1}}}
    ]) as any[];

    expect(results).to.have.length(3);
    results = _.orderBy(results, [__NODE_ID__, 'someFlag']);
    expect(results).to.be.deep.eq([
      {
        someFlag: '0', sum: 3, '__class__': 'DataRow',
        '__nodeId__': 'system',
        '__registry__': 'typeorm'
      },
      {
        someFlag: '10', sum: 3, '__class__': 'DataRow',
        '__nodeId__': 'system',
        '__registry__': 'typeorm'
      },
      {
        someFlag: '20', sum: 4, '__class__': 'DataRow',
        '__nodeId__': 'system',
        '__registry__': 'typeorm'
      }
    ]);

    const nodeIds = _.uniq(results.map(x => {
      return x[__NODE_ID__];
    }));
    expect(nodeIds).to.be.deep.eq(['system']);
  }


  @test
  async 'limit and offset'() {
    const controller = Container.get(DistributedStorageEntityController);
    const results = await controller.aggregate(DataRow, [
      {$group: {_id: 'someFlag', sum: {$sum: 1}}},
      {$skip: 1},
      {$limit: 1}
    ]) as any[];

    // console.log(results);
    expect(results).to.have.length(1);
    expect(results[0]).to.be.deep.eq({
      sum: 7, someFlag: '10', '__class__': 'DataRow',
      '__nodeId__': 'system',
      '__registry__': 'typeorm'
    });

    const nodeIds = _.uniq(results.map(x => {
      return x[__NODE_ID__];
    }));
    expect(nodeIds).to.be.deep.eq(['system']);
  }


  @test
  async 'causing remote exception'() {
    const controller = Container.get(DistributedStorageEntityController);
    try {
      const results = await controller.aggregate(DataRow, [
        {$group: {_id: 'do_not_exists', sum: {$sum: 1}}}
      ]) as any[];
      expect(false, 'exception not fired ...').to.be.eq(true);
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.be.eq('system: SQLITE_ERROR: no such column: aggr.do_not_exists');
    }
  }


}

