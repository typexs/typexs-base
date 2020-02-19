import {suite, test} from 'mocha-typescript';
import * as _ from 'lodash';
import * as path from 'path';
import {expect} from 'chai';
import {Bootstrap} from '../../../../src/Bootstrap';
import {Config} from 'commons-config';
import {TestHelper} from '../../TestHelper';
import {SpawnHandle} from '../../SpawnHandle';
import {Injector} from '../../../../src/libs/di/Injector';
import {ConfigExchange} from '../../../../src/adapters/exchange/config/ConfigExchange';
import {Log} from '../../../../src/libs/logging/Log';

const LOG_EVENT = TestHelper.logEnable(true);

let bootstrap: Bootstrap;

@suite('functional/messaging/config/exchange_spawn')
class MessagingSpec {


  async before() {
    Bootstrap.reset();
    Config.clear();
    Log.enable = true;
  }

  async after() {
    if (bootstrap) {
      await bootstrap.shutdown();
    }
  }


  @test
  async 'config message exchange'() {
    const p = SpawnHandle.do(__dirname + '/fake_app/node_01.ts').start(LOG_EVENT);

    const appdir = path.join(__dirname, 'fake_app');

    bootstrap = await Bootstrap.configure({
      app: {
        path: appdir
      },
      modules: {
        paths: [
          __dirname + '/../../../..'
        ]
      }
    });
    await bootstrap.activateLogger();
    await bootstrap.prepareRuntime();
    await bootstrap.activateStorage();
    await bootstrap.startup();


    Log.debug('----------------------');
    await p.started;
    await TestHelper.wait(50);

    const exchange = Injector.get(ConfigExchange);
    const results = await exchange.key('app', {mode: 'map'});


    p.shutdown();
    await p.done;

    expect(_.keys(results)).to.be.deep.eq(['remote_fakeapp01:0']);
    expect(_.values(results)).to.be.deep.eq([
      {
        'name': 'fakeapp01',
        'nodeId': 'remote_fakeapp01',
        'path': __dirname + '/fake_app'
      }
    ]);

  }


}

