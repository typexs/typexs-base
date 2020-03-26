// process.env.SQL_LOG = '1'
import * as _ from 'lodash';
import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';
import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from 'commons-config';
import {TEST_STORAGE_OPTIONS} from '../config';
import {IEventBusConfiguration} from 'commons-eventbus';
import {Container} from 'typedi';
import {TestHelper} from '../TestHelper';

import {DistributedStorageEntityController} from '../../../src/libs/distributed_storage/DistributedStorageEntityController';
import {DistributedQueryWorker} from '../../../src/workers/DistributedQueryWorker';
import {ITypexsOptions} from '../../../src/libs/ITypexsOptions';
import {DataRow} from './fake_app/entities/DataRow';
import {C_STORAGE_DEFAULT, Injector, StorageRef, SystemNodeInfo, XS_P_$COUNT} from '../../../src';
import {IEntityController} from '../../../src/libs/storage/IEntityController';
import {SpawnHandle} from '../SpawnHandle';
import {__NODE_ID__} from '../../../src/libs/distributed_storage/Constants';


const LOG_EVENT = TestHelper.logEnable(false);

let bootstrap: Bootstrap;
let controllerRef: IEntityController;
const p: SpawnHandle[] = [];

@suite('functional/distributed/find_single_on_multiple_nodes (sql)')
class DistributedQuerySpec {


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
        // CONFIG ADDED
        workers: {access: [{name: 'DistributedQueryWorker', access: 'allow'}]}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();


    p[0] = SpawnHandle.do(__dirname + '/fake_app/node.ts').nodeId('remote01').start(LOG_EVENT);
    await p[0].started;

    p[1] = SpawnHandle.do(__dirname + '/fake_app/node.ts').nodeId('remote02').start(LOG_EVENT);
    await p[1].started;

    await TestHelper.wait(100);


    const entries = [];
    for (let i = 1; i <= 20; i++) {
      const e = new DataRow();
      e.id = i;
      e.someBool = i % 2 === 0;
      e.someDate = new Date(2020, i % 12, i % 30);
      e.someNumber = i * 10;
      e.someString = 'test ' + i;
      entries.push(e);
    }

    const storageRef = Injector.get(C_STORAGE_DEFAULT) as StorageRef;
    controllerRef = storageRef.getController();
    await controllerRef.save(entries);

  }


  static async after() {
    if (bootstrap) {
      await bootstrap.shutdown();
    }

    if (p.length > 0) {
      p.map(x => x.shutdown());
      await Promise.all(p.map(x => x.done));
    }

  }


  @test
  async 'findOne single entity'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entity = await controller.findOne(DataRow, {id: 10}, {hint: 'remote02'});
    console.log(entity);
    expect(entity).to.deep.include({
      id: 10,
      someNumber: 100,
      someString: 'test 10 remote02',
      someBool: true,
      __class__: 'DataRow',
      __nodeId__: 'remote02',
      __registry__: 'typeorm'
    });
  }


  @test
  async 'findOne single entity by target'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entity = await controller.findOne(DataRow, {id: 11}, {targetIds: ['remote01']});
    console.log(entity);
    expect(entity).to.deep.include({
      id: 11,
      someNumber: 110,
      someString: 'test 11 remote01',
      someBool: false,
      __class__: 'DataRow',
      __nodeId__: 'remote01',
      __registry__: 'typeorm'
    });

    expect(entity.someDate).to.be.instanceOf(Date);
  }


  @test
  async 'find single entity with limit'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entities = await controller.find(DataRow, {id: 10}, {limit: 1});
    // console.log(entities);
    expect(entities).to.have.length(3);
    expect(entities[XS_P_$COUNT]).to.be.eq(3);

    expect(_.orderBy(entities, [__NODE_ID__])).to.deep.eq([

      {
        '__class__': 'DataRow',
        '__nodeId__': 'remote01',
        '__registry__': 'typeorm',
        'id': 10,
        'someBool': true,
        'someDate': new Date('2020-11-09T23:00:00.000Z'),
        'someNumber': 100,
        'someString': 'test 10 remote01',
      },
      {
        '__class__': 'DataRow',
        '__nodeId__': 'remote02',
        '__registry__': 'typeorm',
        'id': 10,
        'someBool': true,
        'someDate': new Date('2020-11-09T23:00:00.000Z'),
        'someNumber': 100,
        'someString': 'test 10 remote02',
      },
      {
        '__class__': 'DataRow',
        '__nodeId__': 'system',
        '__registry__': 'typeorm',
        'id': 10,
        'someBool': true,
        'someDate': new Date('2020-11-09T23:00:00.000Z'),
        'someNumber': 100,
        'someString': 'test 10',
      }
    ]);
  }


  @test
  async 'findOne - no results'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entity = await controller.findOne(DataRow, {id: 100});
    expect(entity).to.be.null;
  }


  @test
  async 'find multiple entries'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entities = await controller.find(DataRow, {someBool: true});
    expect(entities).to.have.length(30);
    const resolveByNodeId = {};
    entities.forEach(x => {
      expect(x.id).to.be.gt(0);
      expect(x.someBool === true || x.someBool === false).to.be.true;
      expect(x.someString).to.have.length.gt(4);
      expect(x.someDate).to.be.instanceOf(Date);
      if (!resolveByNodeId[x[__NODE_ID__]]) {
        resolveByNodeId[x[__NODE_ID__]] = 0;
      }
      resolveByNodeId[x[__NODE_ID__]]++;
    });
    expect(resolveByNodeId).to.be.deep.eq({
      'remote01': 10,
      'remote02': 10,
      'system': 10,
    });
  }


  @test
  async 'find multiple entries - no results'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entities = await controller.find(DataRow, {id: {$gte: 50}});
    expect(entities).to.have.length(0);
  }

  @test
  async 'find multiple entries - by target'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entities = await controller.find(DataRow, {id: {$gt: 10}}, {targetIds: ['remote01']});
    expect(entities).to.have.length(10);
    entities.forEach(x => {
      expect(x).to.be.instanceOf(DataRow);
      expect(x[__NODE_ID__]).to.be.eq('remote01');
    });
  }

  @test
  async 'find multiple entries - skip local'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entities = await controller.find(DataRow, {id: {$gt: 10}}, {skipLocal: true});
    expect(entities).to.have.length(20);
    expect(_.uniq(entities.map(x => x[__NODE_ID__])).sort()).to.be.deep.eq(['remote01', 'remote02']);
  }


  @test
  async 'find multiple entries - filter by date'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entities = await controller.find(DataRow, {
      $and: [
        {someDate: {$ge: new Date('2020-11-08T00:00:00.000Z')}},
        {someDate: {$le: new Date('2020-11-10T23:00:00.000Z')}}
      ]
    });
    expect(entities).to.have.length(3);
    entities.forEach(x => {
      expect(x).to.be.instanceOf(DataRow);
      const date = new Date('2020-11-09T23:00:00.000Z');

      expect(x.someDate.toISOString()).to.be.eq(date.toISOString());
    });

  }


  @test
  async 'find multiple entries - output "map"'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entities = await controller.find(DataRow, {someBool: true, id: {$le: 6}}, {outputMode: 'map'}) as any;
    console.log(entities);
    expect(entities[XS_P_$COUNT]).to.be.eq(9);
    expect(entities['remote01'][XS_P_$COUNT]).to.be.eq(3);
    expect(entities['remote02'][XS_P_$COUNT]).to.be.eq(3);
    expect(entities['system'][XS_P_$COUNT]).to.be.eq(3);
    expect(entities['remote01']).to.be.deep.eq([
      {
        '__class__': 'DataRow',
        '__nodeId__': 'remote01',
        '__registry__': 'typeorm',
        'id': 2,
        'someBool': true,
        'someDate': new Date('2020-03-01T23:00:00.000Z'),
        'someNumber': 20,
        'someString': 'test 2 remote01',
      },
      {
        '__class__': 'DataRow',
        '__nodeId__': 'remote01',
        '__registry__': 'typeorm',
        'id': 4,
        'someBool': true,
        'someDate': new Date('2020-05-03T22:00:00.000Z'),
        'someNumber': 40,
        'someString': 'test 4 remote01',
      },
      {
        '__class__': 'DataRow',
        '__nodeId__': 'remote01',
        '__registry__': 'typeorm',
        'id': 6,
        'someBool': true,
        'someDate': new Date('2020-07-05T22:00:00.000Z'),
        'someNumber': 60,
        'someString': 'test 6 remote01'
      }
    ]);

  }

  @test
  async 'find multiple entries - output "only_value"'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entities = await controller.find(DataRow, {someBool: true}, {outputMode: 'only_value'});
    expect(entities).to.be.have.length(30);

  }

  /**
   * nodeId are always embedded in the records
   */
  @test
  async 'find multiple entries - output "embed_nodeId"'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entities = await controller.find(DataRow, {someBool: true}, {outputMode: 'embed_nodeId'});
    expect(entities).to.be.have.length(30);
    expect(_.uniq(entities.map(x => x[__NODE_ID__])).sort()).to.be.deep.eq(['remote01', 'remote02', 'system']);
  }


  /**
   * Reruns directly the remote responses, skips also error handling!
   */
  @test
  async 'find multiple entries - output "responses"'() {
    const controller = Container.get(DistributedStorageEntityController);
    const responses = await controller.find(DataRow, {someBool: true}, {outputMode: 'responses'}) as any[];
    console.log(responses);
    expect(responses).to.be.have.length(3);
    expect(responses.find(x => x.nodeId === 'remote01').results).to.be.have.length(10);
  }


  @test
  async 'catch exceptions - wrong search query'() {
    const controller = Container.get(DistributedStorageEntityController);
    try {
      const results = await controller.find(DataRow, {some_body: false, id: {$le: 20}});
      console.log(results);
      expect(false, 'exception not fired ...').to.be.eq(true);
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message.split('\n').sort()).to.be.deep.eq([

        'remote01: condition property "some_body" is not definied',
        'remote02: condition property "some_body" is not definied',
        'system: condition property "some_body" is not definied',

      ]);
    }

  }


  @test
  async 'run query on two nodes'() {
    const controller = Container.get(DistributedStorageEntityController);
    const results = await controller.find(SystemNodeInfo);

    expect(results).to.have.length(9);
    expect(results[0]).to.be.instanceOf(SystemNodeInfo);
  }


  @test
  async 'run query on two nodes with conditions'() {

    const controller = Container.get(DistributedStorageEntityController);
    const results = await controller.find(SystemNodeInfo, {nodeId: 'system'});

    expect(results).to.have.length(3);
    expect(results[XS_P_$COUNT]).to.be.eq(3);
    expect(_.uniq(results.map((x: any) => x.nodeId))).to.be.deep.eq(['system']);
    expect(results[0]).to.be.instanceOf(SystemNodeInfo);

  }


  @test
  async 'multiple queries after an other'() {

    const controller = Container.get(DistributedStorageEntityController);
    const results1 = await controller.find(SystemNodeInfo, {nodeId: 'system'});
    expect(results1).to.have.length(3);
    expect(_.map(results1, (x: any) => x.nodeId)).to.contain.members(['system']);

    const results2 = await controller.find(SystemNodeInfo, {nodeId: 'remote01'});
    expect(results2).to.have.length(3);
    expect(_.map(results2, (x: any) => x.nodeId)).to.contain.members(['remote01']);

  }


  @test
  async 'find all'() {

    const controller = Container.get(DistributedStorageEntityController);
    const res = await controller.find(SystemNodeInfo);

    expect(res).to.not.be.null;
    expect(res).to.have.length(9);
    expect(res[XS_P_$COUNT]).to.be.eq(9);
    expect(res.map((x: any) => x.nodeId)).to.contain.members(['remote01', 'remote02', 'system']);
  }


  @test
  async 'find with conditions'() {
    const controller = Container.get(DistributedStorageEntityController);
    const res = await controller.find(SystemNodeInfo, {nodeId: 'system'});

    expect(res).to.not.be.null;
    expect(res).to.have.length(3);
    expect(res[XS_P_$COUNT]).to.be.eq(3);
    expect(res.map((x: any) => x.nodeId)).to.contain.members(['system']);
    expect(res.map((x: any) => x.nodeId)).to.not.contain.members(['remote02']);
  }

}

