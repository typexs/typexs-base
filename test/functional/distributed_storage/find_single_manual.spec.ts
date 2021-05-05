import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from '@allgemein/config';
import {TEST_STORAGE_OPTIONS} from '../config';
import {IEventBusConfiguration} from 'commons-eventbus';
import {Container} from 'typedi';
import {TestHelper} from '../TestHelper';
import {SystemNodeInfo} from '../../../src/entities/SystemNodeInfo';

import {DistributedStorageEntityController} from '../../../src/libs/distributed_storage/DistributedStorageEntityController';
import {DistributedQueryWorker} from '../../../src/workers/DistributedQueryWorker';
import {IWorkerInfo} from '../../../src/libs/worker/IWorkerInfo';
import {ITypexsOptions} from '../../../src/libs/ITypexsOptions';
import {System} from '../../../src/libs/system/System';
import {C_WORKERS} from '../../../src/libs/worker/Constants';


const LOG_EVENT = TestHelper.logEnable(false);

let bootstrap: Bootstrap;

@suite('functional/distributed/find_single_manual')
class DistributedQuerySpec {


  async before() {
    Bootstrap.reset();
    Config.clear();

    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'system', path: __dirname + '/fake_app'},
        logging: {enable: LOG_EVENT, level: 'debug'},
        modules: {paths: [__dirname + '/../../..'], disableCache: true},
        storage: {default: TEST_STORAGE_OPTIONS},
        eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();
  }

  async after() {
    if (bootstrap) {
      await bootstrap.shutdown();
    }
  }

  @test
  async 'start worker manual'() {
    const system: System = Container.get(System.NAME);
    system.node.contexts.find(c => c.context === C_WORKERS)
      .workers.push(<IWorkerInfo>{className: DistributedQueryWorker.name});

    const worker = Container.get(DistributedQueryWorker);
    await worker.prepare();

    const controller = Container.get(DistributedStorageEntityController);
    const results = await controller.find(SystemNodeInfo);
    expect(results).to.have.length(1);
  }

}

