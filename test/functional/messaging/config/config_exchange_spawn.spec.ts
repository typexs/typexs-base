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

const LOG_EVENT = TestHelper.logEnable(false);

let bootstrap: Bootstrap;
let spawned: SpawnHandle;

@suite('functional/messaging/config/exchange_spawn')
class MessagingSpec {


  static async before() {
    Bootstrap.reset();
    Config.clear();
    spawned = SpawnHandle.do(__dirname + '/fake_app/node_01.ts').start(LOG_EVENT);

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


    await spawned.started;
  }



  static async after() {

    if (spawned) {
      spawned.shutdown();
      await spawned.done;
    }

    if (bootstrap) {
      await bootstrap.shutdown();
    }
  }

  @test
  async 'config message exchange'() {


    const exchange = Injector.get(ConfigExchange);
    const results = await exchange.key('app', {mode: 'map'});



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

