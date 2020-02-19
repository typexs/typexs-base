import {suite, test} from 'mocha-typescript';
import * as path from 'path';
import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from 'commons-config';

let bootstrap: Bootstrap;

@suite('functional/messaging/messaging')
class MessagingSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }


  @test
  async 'sys'() {
    const appdir = path.join(__dirname, 'fake_app');

    bootstrap = await Bootstrap.configure({
      app: {
        path: appdir
      },
      modules: {
        paths: [
          __dirname + '/../../..'
        ]
      }
    });
    await bootstrap.prepareRuntime();
    await bootstrap.activateStorage();
    await bootstrap.startup();

    // const mWorker = new MessageWorker();


    await bootstrap.shutdown();
  }


}

