import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';
import * as _ from 'lodash';
import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from 'commons-config';
import {TEST_STORAGE_OPTIONS} from '../config';
import {IEventBusConfiguration} from 'commons-eventbus';
import {Container} from 'typedi';
import {TestHelper} from '../TestHelper';
import {SpawnHandle} from '../SpawnHandle';
import {SystemNodeInfo} from '../../../src/entities/SystemNodeInfo';

import {DistributedStorageEntityController} from '../../../src/libs/distributed_storage/DistributedStorageEntityController';
import {DistributedQueryWorker} from '../../../src/workers/DistributedQueryWorker';
import {ITypexsOptions} from '../../../src/libs/ITypexsOptions';
import {XS_P_$COUNT} from '../../../src/libs/Constants';


const LOG_EVENT = TestHelper.logEnable(false);

let bootstrap: Bootstrap;
let p: SpawnHandle;

@suite('functional/distributed/find_multi_nodes')
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
        workers: {access: [{name: 'DistributedQueryWorker', access: 'allow'}]}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();

    p = SpawnHandle.do(__dirname + '/fake_app/node.ts').start(LOG_EVENT);
    await p.started;
    await TestHelper.wait(100);
  }

  static async after() {
    if (bootstrap) {
      await bootstrap.shutdown();
    }
    if (p) {
      p.shutdown();
      await p.done;
    }
  }


  @test
  async 'run query on two nodes'() {
    const controller = Container.get(DistributedStorageEntityController);
    const results = await controller.find(SystemNodeInfo);

    expect(results).to.have.length(4);
    expect(results[0]).to.be.instanceOf(SystemNodeInfo);
  }


  @test
  async 'run query on two nodes with conditions'() {

    const controller = Container.get(DistributedStorageEntityController);
    const results = await controller.find(SystemNodeInfo, {nodeId: 'system'});

    expect(results).to.have.length(2);
    expect(results[XS_P_$COUNT]).to.be.eq(2);
    expect(_.uniq(results.map((x: any) => x.nodeId))).to.be.deep.eq(['system']);
    expect(results[0]).to.be.instanceOf(SystemNodeInfo);

  }


  @test
  async 'multiple queries after an other'() {

    const controller = Container.get(DistributedStorageEntityController);
    const results1 = await controller.find(SystemNodeInfo, {nodeId: 'system'});
    expect(results1).to.have.length(2);
    expect(_.map(results1, (x: any) => x.nodeId)).to.contain.members(['system']);

    const results2 = await controller.find(SystemNodeInfo, {nodeId: 'fakeapp01'});
    expect(results2).to.have.length(2);
    expect(_.map(results2, (x: any) => x.nodeId)).to.contain.members(['fakeapp01']);

  }


  @test
  async 'find all'() {

    const controller = Container.get(DistributedStorageEntityController);
    const res = await controller.find(SystemNodeInfo);

    expect(res).to.not.be.null;
    expect(res).to.have.length(4);
    expect(res[XS_P_$COUNT]).to.be.eq(4);
    expect(res.map((x: any) => x.nodeId)).to.contain.members(['fakeapp01', 'system']);
  }


  @test
  async 'find with conditions'() {
    const controller = Container.get(DistributedStorageEntityController);
    const res = await controller.find(SystemNodeInfo, {nodeId: 'system'});

    expect(res).to.not.be.null;
    expect(res).to.have.length(2);
    expect(res[XS_P_$COUNT]).to.be.eq(2);
    expect(res.map((x: any) => x.nodeId)).to.contain.members(['system']);
    expect(res.map((x: any) => x.nodeId)).to.not.contain.members(['fakeapp01']);
  }

}

