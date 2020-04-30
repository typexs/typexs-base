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
import {DataRow} from './fake_app/entities/DataRow';
import * as _ from 'lodash';
import {__NODE_ID__} from '../../../src/libs/distributed_storage/Constants';
import {Injector} from '../../../src/libs/di/Injector';
import {C_STORAGE_DEFAULT} from '../../../src/libs/Constants';
import {StorageRef} from '../../../src/libs/storage/StorageRef';
import {SpawnHandle} from '../SpawnHandle';
import {generateSqlDataRows} from './helper';


const LOG_EVENT = TestHelper.logEnable(false);

let bootstrap: Bootstrap;

// let p: SpawnHandle;
const p: SpawnHandle[] = [];


@suite('functional/distributed_storage/aggregate_on_multi_nodes (sql)')
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

    p[0] = SpawnHandle.do(__dirname + '/fake_app/node.ts').nodeId('remote01').start(LOG_EVENT);
    await p[0].started;

    p[1] = SpawnHandle.do(__dirname + '/fake_app/node.ts').nodeId('remote02').start(LOG_EVENT);
    await p[1].started;

    await TestHelper.wait(500);

    const entries = generateSqlDataRows();
    await storageRef.getController().save(entries);
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
  async 'simple match aggregation'() {
    const controller = Container.get(DistributedStorageEntityController);
    let results = await controller.aggregate(DataRow, [{$match: {someBool: true}}]);
    expect(results).to.have.length(30);
    results = _.orderBy(results, [__NODE_ID__]);
    // console.log(results);
    const evenIds = results.map(x => {
      return x.id;
    });

    expect(evenIds).to.be.deep.eq(_.concat(_.range(1, 11).map(x => x * 2), _.range(1, 11).map(x => x * 2), _.range(1, 11).map(x => x * 2)));
    const nodeIds = _.uniq(results.map(x => {
      return x[__NODE_ID__];
    }));
    expect(nodeIds).to.be.deep.eq(['remote01', 'remote02', 'system']);

  }


  @test
  async 'match and group aggregation'() {
    const controller = Container.get(DistributedStorageEntityController);
    let results = await controller.aggregate(DataRow, [
      {$match: {someBool: true}},
      {$group: {_id: null, sum: {$sum: 1}}}
    ]) as any[];


    expect(results).to.have.length(3);
    results = _.orderBy(results, [__NODE_ID__]);
    expect(results[0]).to.be.deep.eq({sum: 10, __nodeId__: 'remote01'});
    expect(results[1]).to.be.deep.eq({sum: 10, __nodeId__: 'remote02'});
    expect(results[2]).to.be.deep.eq({sum: 10, __nodeId__: 'system'});

    const nodeIds = _.uniq(results.map(x => {
      return x[__NODE_ID__];
    }));
    expect(nodeIds).to.be.deep.eq(['remote01', 'remote02', 'system']);

  }


  @test
  async 'match and group aggregation on targeted node'() {
    const controller = Container.get(DistributedStorageEntityController);
    let results = await controller.aggregate(DataRow, [
      {$match: {someBool: true}},
      {$group: {_id: null, sum: {$sum: 1}}}
    ], {targetIds: ['remote02']}) as any[];


    expect(results).to.have.length(1);
    results = _.orderBy(results, [__NODE_ID__]);
    expect(results[0]).to.be.deep.eq({sum: 10, __nodeId__: 'remote02'});

    const nodeIds = _.uniq(results.map(x => {
      return x[__NODE_ID__];
    }));
    expect(nodeIds).to.be.deep.eq(['remote02']);
  }

  @test
  async 'match and group by key aggregation'() {
    const controller = Container.get(DistributedStorageEntityController);
    let results = await controller.aggregate(DataRow, [
      {$match: {someBool: true}},
      {$group: {_id: 'someFlag', sum: {$sum: 1}}}
    ]) as any[];

    expect(results).to.have.length(9);
    results = _.orderBy(results, [__NODE_ID__, 'someFlag']);
    expect(results).to.be.deep.eq([
      {someFlag: '0', sum: 3, __nodeId__: 'remote01'},
      {someFlag: '10', sum: 3, __nodeId__: 'remote01'},
      {someFlag: '20', sum: 4, __nodeId__: 'remote01'},
      {someFlag: '0', sum: 3, __nodeId__: 'remote02'},
      {someFlag: '10', sum: 3, __nodeId__: 'remote02'},
      {someFlag: '20', sum: 4, __nodeId__: 'remote02'},
      {someFlag: '0', sum: 3, __nodeId__: 'system'},
      {someFlag: '10', sum: 3, __nodeId__: 'system'},
      {someFlag: '20', sum: 4, __nodeId__: 'system'}
    ]);

    const nodeIds = _.uniq(results.map(x => {
      return x[__NODE_ID__];
    }));
    expect(nodeIds).to.be.deep.eq(['remote01', 'remote02', 'system']);
  }


  @test
  async 'limit and offset'() {
    const controller = Container.get(DistributedStorageEntityController);
    let results = await controller.aggregate(DataRow, [
      {$group: {_id: 'someFlag', sum: {$sum: 1}}},
      {$skip: 1},
      {$limit: 1}
    ]) as any[];
    results = _.orderBy(results, [__NODE_ID__, 'someFlag']);
    expect(results).to.have.length(3);
    expect(results[0]).to.be.deep.eq({someFlag: '10', sum: 7, __nodeId__: 'remote01'});

    const nodeIds = _.uniq(results.map(x => {
      return x[__NODE_ID__];
    }));
    expect(nodeIds).to.be.deep.eq(['remote01', 'remote02', 'system']);
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
      expect(e.message.split('\n').sort()).to.be.deep.eq([
        'remote01: SQLITE_ERROR: no such column: aggr.do_not_exists',
        'remote02: SQLITE_ERROR: no such column: aggr.do_not_exists',
        'system: SQLITE_ERROR: no such column: aggr.do_not_exists'
      ]);
    }
  }

}

