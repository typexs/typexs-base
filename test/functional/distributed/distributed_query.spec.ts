import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';
import * as _ from 'lodash';
import {Bootstrap} from '../../../src/Bootstrap';
import {C_WORKERS, ITypexsOptions, System, XS_P_$COUNT} from '../../../src';
import {Config} from 'commons-config';
import {TEST_STORAGE_OPTIONS} from '../config';
import {IEventBusConfiguration} from 'commons-eventbus';
import {Container} from 'typedi';
import {TestHelper} from '../TestHelper';
import {SpawnHandle} from '../SpawnHandle';
import {SystemNodeInfo} from '../../../src/entities/SystemNodeInfo';

import {DistributedStorageEntityController} from '../../../src/libs/distributed/DistributedStorageEntityController';
import {DistributedQueryWorker} from '../../../src/workers/DistributedQueryWorker';
import {Workers} from '../../../src/libs/worker/Workers';
import {IWorkerInfo} from '../../../src/libs/worker/IWorkerInfo';


const LOG_EVENT = TestHelper.logEnable(false);


@suite('functional/distributed/query')
class DistributedQuerySpec {


  async before() {
    Bootstrap.reset();
    Config.clear();
  }


  @test
  async 'run without config'() {
    let bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'system', path: __dirname + '/fake_app'},
        logging: {enable: LOG_EVENT, level: 'debug'},
        modules: {paths: [__dirname + '/../../..']},
        storage: {default: TEST_STORAGE_OPTIONS},
        eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();

    const system: System = Container.get(System.NAME);
    system.node.contexts.find(c => c.context === C_WORKERS).workers.push(<IWorkerInfo>{className: DistributedQueryWorker.name});

    const worker = Container.get(DistributedQueryWorker);
    await worker.prepare();

    const controller = Container.get(DistributedStorageEntityController);
    const results = await controller.find(SystemNodeInfo);
    expect(results).to.have.length(1);
    await bootstrap.shutdown();
  }


  @test
  async 'run with config'() {
    let bootstrap = Bootstrap
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

    const workers: Workers = Container.get(Workers.NAME);
    const active = workers.activeWorkerCount();

    expect(active).to.be.eq(1);

    const controller = Container.get(DistributedStorageEntityController);
    const results = await controller.find(SystemNodeInfo);

    expect(results).to.have.length(1);

    await bootstrap.shutdown();
  }


  @test
  async 'run query on two nodes'() {
    let bootstrap = Bootstrap
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


    const p = SpawnHandle.do(__dirname + '/fake_app/node.ts').start(LOG_EVENT);
    await p.started;

    const controller = Container.get(DistributedStorageEntityController);
    const results = await controller.find(SystemNodeInfo);

    p.shutdown();
    await p.done;
    await bootstrap.shutdown();

    expect(results).to.have.length(4);
    expect(results[0]).to.be.instanceOf(SystemNodeInfo);

  }


  @test
  async 'run query on two nodes with conditions'() {
    let bootstrap = Bootstrap
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


    const p = SpawnHandle.do(__dirname + '/fake_app/node.ts').start(LOG_EVENT);
    await p.started;
    // wait for registration event
    await TestHelper.wait(100);

    const controller = Container.get(DistributedStorageEntityController);
    const results = await controller.find(SystemNodeInfo, {nodeId: 'system'});

    p.shutdown();
    await p.done;
    await bootstrap.shutdown();


    expect(results).to.have.length(2);
    expect(results[XS_P_$COUNT]).to.be.eq(2);
    expect(_.uniq(results.map((x: any) => x.nodeId))).to.be.deep.eq(['system']);
    expect(results[0]).to.be.instanceOf(SystemNodeInfo);

  }


  @test
  async 'multiple queries after an other'() {
    let bootstrap = Bootstrap
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


    const p = SpawnHandle.do(__dirname + '/fake_app/node.ts').start(LOG_EVENT);
    await p.started;

    // wait for registration event
    await TestHelper.wait(100);

    const controller = Container.get(DistributedStorageEntityController);
    const results1 = await controller.find(SystemNodeInfo, {nodeId: 'system'});
    expect(results1).to.have.length(2);
    expect(_.map(results1, (x: any) => x.nodeId)).to.contain.members(['system']);

    const results2 = await controller.find(SystemNodeInfo, {nodeId: 'fakeapp01'});
    expect(results2).to.have.length(2);
    expect(_.map(results2, (x: any) => x.nodeId)).to.contain.members(['fakeapp01']);

    p.shutdown();
    await p.done;
    await bootstrap.shutdown();


  }
}

