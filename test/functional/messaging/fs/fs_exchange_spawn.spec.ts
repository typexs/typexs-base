import {suite, test} from 'mocha-typescript';
import * as path from 'path';
import {Bootstrap} from '../../../../src/Bootstrap';
import {Config} from 'commons-config';
import {TestHelper} from '../../TestHelper';
import {SpawnHandle} from '../../SpawnHandle';
import {Injector} from '../../../../src/libs/di/Injector';
import {Log} from '../../../../src/libs/logging/Log';
import {FileExchange} from '../../../../src/adapters/exchange/file/FileExchange';

const LOG_EVENT = TestHelper.logEnable(true);

let bootstrap: Bootstrap;

@suite('functional/messaging/fs/exchange_spawn')
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
  async 'message exchange'() {
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

    const exchange = Injector.get(FileExchange);
    const results = await exchange.file(__dirname + '/fake_app/test.txt');
    const data = results.toString();


    p.shutdown();
    await p.done;
    console.log(data);

    //
    // expect(_.keys(results)).to.be.deep.eq(['remote_fakeapp01:0']);
    // expect(_.values(results)).to.be.deep.eq([
    //   {
    //     'name': 'fakeapp01',
    //     'nodeId': 'remote_fakeapp01',
    //     'path': __dirname + '/fake_app'
    //   }
    // ]);

  }


}

