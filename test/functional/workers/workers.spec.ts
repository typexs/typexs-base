import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';

import {TestHelper} from '../TestHelper';
import {Log} from '../../../src/libs/logging/Log';
import {Injector} from '../../../src/libs/di/Injector';
import {RegistryFactory} from '@allgemein/schema-api';
import {C_WORKERS, Workers} from '../../../src';
import {DummyWorker} from './data/DummyWorker';


const LOG_EVENT = TestHelper.logEnable(false);
let workers: Workers;

@suite('functional/workers/workers')
class TasksSpec {

  static async before() {
    await TestHelper.clearCache();
    Log.reset();
    Log.options({level: 'debug', enable: LOG_EVENT});
    // const i = new Invoker();
    // Injector.set(Invoker.NAME, i);
    // i.register(TasksApi, []);

    RegistryFactory.remove(C_WORKERS);
    RegistryFactory.register(/^workers\.?/, Workers);

    const registry = RegistryFactory.get(C_WORKERS) as Workers;
    Injector.set(Workers.NAME, registry);

  }


  static after() {
    Injector.reset();
  }


  before() {
    workers = RegistryFactory.get(C_WORKERS) as Workers;
  }

  after() {
    RegistryFactory.remove(C_WORKERS);
  }

  @test
  async 'try register worker without access config'() {
    const allowed = workers.access('DummyWorker');
    expect(allowed).to.be.false;

    const workerRef = workers.addWorkerClass(DummyWorker);
    expect(workerRef).to.be.null;
  }


  @test
  async 'register worker'() {
    workers.setConfig({access: [{access: 'allow', name: '*'}]});

    const allowed = workers.access('DummyWorker');
    expect(allowed).to.be.true;

    const workerRef = workers.addWorkerClass(DummyWorker);
    expect(workerRef.getClassRef().name).to.be.eq('DummyWorker');
  }


}

