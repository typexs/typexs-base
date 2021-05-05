// process.env.SQL_LOG = '1'
import * as _ from 'lodash';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from '@allgemein/config';
import {TEST_STORAGE_OPTIONS} from '../config';
import {IEventBusConfiguration} from 'commons-eventbus';
import {Container} from 'typedi';
import {TestHelper} from '../TestHelper';

import {DistributedStorageEntityController} from '../../../src/libs/distributed_storage/DistributedStorageEntityController';
import {ITypexsOptions} from '../../../src/libs/ITypexsOptions';
import {DataRow} from './fake_app/entities/DataRow';
import {IEntityController} from '../../../src/libs/storage/IEntityController';
import {SpawnHandle} from '../SpawnHandle';
import {generateSqlDataRows} from './helper';
import {Injector} from '../../../src/libs/di/Injector';
import {__NODE_ID__, __REGISTRY__, C_STORAGE_DEFAULT, XS_P_$COUNT} from '../../../src/libs/Constants';
import {StorageRef} from '../../../src/libs/storage/StorageRef';
import {__CLASS__} from '@allgemein/schema-api';


const LOG_EVENT = TestHelper.logEnable(false);

let bootstrap: Bootstrap;
let controllerRef: IEntityController;
const p: SpawnHandle[] = [];

@suite('functional/distributed/find_on_remote_node (sql)')
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
        // workers: {access: [{name: 'DistributedQueryWorker', access: 'allow'}]}
        // workers: {access: [{name: 'DistributedQueryWorker', access: 'allow'}]}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();


    p[0] = SpawnHandle.do(__dirname + '/fake_app/node.ts').nodeId('remote01').start(LOG_EVENT);
    await p[0].started;

    // p[1] = SpawnHandle.do(__dirname + '/fake_app/node.ts').nodeId('remote02').start(LOG_EVENT);
    // await p[1].started;

    await TestHelper.wait(500);

    const entries = generateSqlDataRows();

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
    const entity = await controller.findOne(DataRow, {id: 10});
    expect(entity).to.deep.include({
      id: 10,
      someNumber: 100,
      someString: 'test 10',
      someBool: true,
      [__NODE_ID__]: 'remote01',
      [__CLASS__]: 'DataRow',
      [__REGISTRY__]: 'typeorm',
    });
  }


  @test
  async 'findOne single entity by target'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entity = await controller.findOne(DataRow, {id: 11});
    expect(entity).to.deep.include({
      id: 11,
      someNumber: 110,
      someString: 'test 11',
      someBool: false,
      [__NODE_ID__]: 'remote01',
      [__CLASS__]: 'DataRow',
      [__REGISTRY__]: 'typeorm',
    });

    expect(entity.someDate).to.be.instanceOf(Date);
  }


  @test
  async 'find single entity with limit'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entities = await controller.find(DataRow, {id: 10}, {limit: 1});
    expect(entities).to.have.length(1);
    expect(entities[XS_P_$COUNT]).to.be.eq(1);
    expect(_.orderBy(entities, [__NODE_ID__])).to.deep.eq([
      {
        [__NODE_ID__]: 'remote01',
        [__CLASS__]: 'DataRow',
        [__REGISTRY__]: 'typeorm',
        'id': 10,
        'someBool': true,
        'someDate': new Date(2020, 10, 10),
        'someNumber': 100,
        'someString': 'test 10',
        'someFlag': '10',
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
    expect(entities).to.have.length(10);
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
      'remote01': 10
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
  async 'find multiple entries - filter by date'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entities = await controller.find(DataRow, {
      $and: [
        {someDate: {$ge: new Date(2020, 10, 8)}},
        {someDate: {$le: new Date(2020, 10, 10)}}
      ]
    });
    expect(entities).to.have.length(1);
    entities.forEach(x => {
      expect(x).to.be.instanceOf(DataRow);
      const date = new Date(2020, 10, 10);
      expect(x.someDate.toISOString()).to.be.eq(date.toISOString());
    });

  }


  @test
  async 'find multiple entries - output "map"'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entities = await controller.find(DataRow, {someBool: true, id: {$le: 6}}, {outputMode: 'map'}) as any;
    expect(entities[XS_P_$COUNT]).to.be.eq(3);
    expect(entities['remote01'][XS_P_$COUNT]).to.be.eq(3);
    expect(entities['remote01']).to.be.deep.eq([
      {
        [__NODE_ID__]: 'remote01',
        [__CLASS__]: 'DataRow',
        [__REGISTRY__]: 'typeorm',
        'id': 2,
        'someBool': true,
        'someFlag': '20',
        'someDate': new Date(2020, 1, 31),
        'someNumber': 20,
        'someString': 'test 2',
      },
      {
        [__NODE_ID__]: 'remote01',
        [__CLASS__]: 'DataRow',
        [__REGISTRY__]: 'typeorm',
        'id': 4,
        'someBool': true,
        'someFlag': '10',
        'someDate': new Date(2020, 4, 4),
        'someNumber': 40,
        'someString': 'test 4',
      },
      {
        [__NODE_ID__]: 'remote01',
        [__CLASS__]: 'DataRow',
        [__REGISTRY__]: 'typeorm',
        'id': 6,
        'someBool': true,
        'someFlag': '0',
        'someDate': new Date(2020, 6, 6),
        'someNumber': 60,
        'someString': 'test 6'
      }
    ]);

  }

  @test
  async 'find multiple entries - output "only_value"'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entities = await controller.find(DataRow, {someBool: true}, {outputMode: 'only_value'});
    expect(entities).to.be.have.length(10);

  }

  /**
   * nodeId are always embedded in the records
   */
  @test
  async 'find multiple entries - output "embed_nodeId"'() {
    const controller = Container.get(DistributedStorageEntityController);
    const entities = await controller.find(DataRow, {someBool: true}, {outputMode: 'embed_nodeId'});
    expect(entities).to.be.have.length(10);
    expect(_.uniq(entities.map(x => x[__NODE_ID__])).sort()).to.be.deep.eq(['remote01']);
  }


  /**
   * Reruns directly the remote responses
   */
  @test
  async 'find multiple entries - output "responses"'() {
    const controller = Container.get(DistributedStorageEntityController);
    const responses = await controller.find(DataRow, {someBool: true}, {outputMode: 'responses'}) as any[];
    // console.log(responses);
    expect(responses).to.be.have.length(1);
    expect(responses.find(x => x.nodeId === 'remote01').results).to.be.have.length(10);


  }

}

