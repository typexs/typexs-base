import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import * as _ from 'lodash';
import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from '@allgemein/config';
import {TEST_STORAGE_OPTIONS} from '../config';
import {EventBus, IEventBusConfiguration} from 'commons-eventbus';
import {Container} from 'typedi';
import {TestHelper} from '../TestHelper';
import {SpawnHandle} from '../SpawnHandle';
import {SystemNodeInfo} from '../../../src/entities/SystemNodeInfo';

import {DistributedStorageEntityController} from '../../../src/libs/distributed_storage/DistributedStorageEntityController';
import {DistributedQueryWorker} from '../../../src/workers/DistributedQueryWorker';
import {Workers} from '../../../src/libs/worker/Workers';
import {C_DEFAULT} from '@allgemein/base';
import {subscribe} from 'commons-eventbus';


const LOG_EVENT = TestHelper.logEnable(false);

let inc = 0;

class TestEvent {
  id: number ;
  constructor(id: number = -1) {
    this.id = id;
  }
}


class TestEventHandler {
  id: number = inc++;

  collect: any[] = [];

  @subscribe(TestEvent)
  on(e: TestEvent) {
    this.collect.push([this.id, e.id]);
  }
}

@suite('functional/eventbus/eventbus')
class EventbusSpec {


  static async before() {
    EventBus.$().shutdown();
    EventBus.$().addConfiguration({adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}, name: C_DEFAULT});
  }

  static async after() {
    EventBus.$().shutdown();
  }

  @test
  async 'check eventbus on/off register'() {

    const h1 = new TestEventHandler();
    await EventBus.register(h1);

    let e = new TestEvent(1);
    EventBus.postAndForget(e);

    e = new TestEvent(2);
    EventBus.postAndForget(e);

    await TestHelper.wait(100);
    expect(h1.collect).to.have.length(2);

    await EventBus.unregister(h1);

    EventBus.postAndForget(new TestEvent(3));
    await TestHelper.wait(100);

    expect(h1.collect).to.have.length(2);

    await EventBus.register(h1);

    EventBus.postAndForget(new TestEvent(4));
    await TestHelper.wait(100);

    expect(h1.collect).to.have.length(3);

    await EventBus.unregister(h1);

  }
}

