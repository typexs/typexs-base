import {suite, test} from '@testdeck/mocha';
import * as _ from 'lodash';
import * as path from 'path';
import {expect} from 'chai';
import {Bootstrap} from '../../../../src/Bootstrap';
import {Config} from '@allgemein/config';
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
      logging: {
        enable: LOG_EVENT
      },

      modules: <any>{
        paths: [
          __dirname + '/../../../..'
        ],
        disableCache: true
      }
    });
    await bootstrap.activateLogger();
    await bootstrap.prepareRuntime();
    await bootstrap.activateStorage();
    await bootstrap.startup();


    await spawned.started;
    await TestHelper.wait(500);
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
    const results = await exchange.key('app', {outputMode: 'map'});

    expect(_.keys(results)).to.be.deep.eq(['fake_app:0', 'remote_fakeapp01:0']);
    expect(_.values(results)).to.be.deep.eq([
      {
        'name': 'fake_app',
        'nodeId': 'fake_app',
        'path': __dirname + '/fake_app'
      },
      {
        'name': 'fakeapp01',
        'nodeId': 'remote_fakeapp01',
        'path': __dirname + '/fake_app'
      }
    ]);

  }

  @test
  async 'config message exchange remote'() {
    const exchange = Injector.get(ConfigExchange);
    const results = await exchange.key('app', {outputMode: 'map', skipLocal: true});
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

