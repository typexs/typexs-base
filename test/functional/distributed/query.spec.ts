import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';
import {Bootstrap} from "../../../src/Bootstrap";
import {ITypexsOptions, Log} from "../../../src";
import {Config} from "commons-config";
import {TEST_STORAGE_OPTIONS} from "../config";
import {EventBus, IEventBusConfiguration} from "commons-eventbus";
import {Container} from "typedi";
import {TestHelper} from "../TestHelper";
import {SpawnHandle} from "../SpawnHandle";
import {SystemNodeInfo} from "../../../src/entities/SystemNodeInfo";

import {DistributedStorageEntityController} from "../../../src/libs/distributed/DistributedStorageEntityController";
import {DistributedQueryWorker} from "../../../src/workers/DistributedQueryWorker";
import {Workers} from "../../../src/libs/worker/Workers";


const LOG_EVENT = TestHelper.logEnable(true);


@suite('functional/distributed/query')
class QuerySpec {


  async before() {
    // TestHelper.typeOrmRestore();
    await EventBus.$().shutdown();
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

    let worker = Container.get(DistributedQueryWorker);
    await worker.prepare();

    let controller = new DistributedStorageEntityController();
    let results = await controller.find(SystemNodeInfo);

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

    let workers: Workers = Container.get(Workers.NAME);
    let active = workers.activeWorkerCount();

    expect(active).to.be.eq(1);

    let controller = new DistributedStorageEntityController();
    let results = await controller.find(SystemNodeInfo);

    expect(results).to.have.length(1);

    await bootstrap.shutdown();
  }



  @test
  async 'run on two nodes'() {
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


    let p = SpawnHandle.do(__dirname + '/fake_app/node.ts').start(LOG_EVENT);
    await p.started;

    let controller = new DistributedStorageEntityController();
    let results = await controller.find(SystemNodeInfo);

    await p.done;
    await bootstrap.shutdown();

    expect(results).to.have.length(4);
    expect(results[0]).to.be.instanceOf(SystemNodeInfo);

    Log.debug(results);
  }
}

