import {suite, test, timeout} from 'mocha-typescript';
import {expect} from 'chai';
import * as _ from 'lodash';
import {SpawnHandle} from '../SpawnHandle';
import {TestHelper} from '../TestHelper';
import {TEST_STORAGE_OPTIONS} from '../config';
import {IEventBusConfiguration} from 'commons-eventbus';
import {Bootstrap} from '../../../src/Bootstrap';
import {Container} from 'typedi';
import {Config} from 'commons-config';
import {SystemNodeInfo} from '../../../src/entities/SystemNodeInfo';
import {DistributedStorageEntityController} from '../../../src/libs/distributed_storage/DistributedStorageEntityController';
import {XS_P_$COUNT} from '../../../src/libs/Constants';

const LOG_EVENT = TestHelper.logEnable(false);

const settingsTemplate: any = {
  storage: {
    default: TEST_STORAGE_OPTIONS
  },

  app: {name: 'demo', path: __dirname + '/../../..', nodeId: 'server'},

  logging: {
    enable: LOG_EVENT,
    level: 'debug',
    transports: [{console: {}}],
  },

  workers: {access: [{name: 'DistributedQueryWorker', access: 'allow'}]},
  eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}},

};

let bootstrap: Bootstrap = null;


@suite('functional/distributed/query_spawning') @timeout(300000)
class DistributedStorageControllerSpec {


  static async before() {
    const settings = _.clone(settingsTemplate);
    Bootstrap.reset();
    Container.reset();
    Config.clear();

    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(settings)
      .activateErrorHandling()
      .activateLogger();

    await bootstrap.prepareRuntime();
    await bootstrap.activateStorage();
    await bootstrap.startup();

  }

  static async after() {

    await bootstrap.shutdown();
    Bootstrap.reset();
    Container.reset();
    Config.clear();
  }


  @test
  async 'query all'() {

    const p = SpawnHandle.do(__dirname + '/fake_app/node.ts').start(LOG_EVENT);
    await p.started;
    await TestHelper.wait(50);


    const controller = Container.get(DistributedStorageEntityController);
    const res = await controller.find(SystemNodeInfo);

    p.shutdown();
    await p.done;

    expect(res).to.not.be.null;
    expect(res).to.have.length(4);
    expect(res[XS_P_$COUNT]).to.be.eq(4);
    expect(res.map((x: any) => x.nodeId)).to.contain.members(['fakeapp01', 'server']);
  }


  @test
  async 'query with conditions'() {
    const p = SpawnHandle.do(__dirname + '/fake_app/node.ts').start(LOG_EVENT);
    await p.started;
    await TestHelper.wait(50);

    const controller = Container.get(DistributedStorageEntityController);
    const res = await controller.find(SystemNodeInfo, {nodeId: 'server'});

    p.shutdown();
    await p.done;

    expect(res).to.not.be.null;
    expect(res).to.have.length(2);
    expect(res[XS_P_$COUNT]).to.be.eq(2);
    expect(res.map((x: any) => x.nodeId)).to.contain.members(['server']);
    expect(res.map((x: any) => x.nodeId)).to.not.contain.members(['fakeapp01']);
  }

}
