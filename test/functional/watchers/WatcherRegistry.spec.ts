import * as chai from 'chai';
import {expect, use} from 'chai';
import * as chaiSpies from 'chai-spies';
import {Config} from 'commons-config';
import {slow, suite, test, timeout} from 'mocha-typescript';
import {Container} from 'typedi';
import {ITypexsOptions} from '../../../src';
import {Bootstrap} from '../../../src/Bootstrap';
import {WatcherRegistry} from '../../../src/libs/watchers/WatcherRegistry';
import {TEST_STORAGE_OPTIONS} from '../config';
import Sandbox = ChaiSpies.Sandbox;

@suite('functional/watchers/WatcherRegistry', slow(5000), timeout(10000))
class WatcherRegistrySpec {
  static bootstrap: Bootstrap;
  static sandbox: Sandbox;

  static before() {
    Container.reset();
    Bootstrap.reset();
    Config.clear();

    use(chaiSpies);
    WatcherRegistrySpec.sandbox = chai.spy.sandbox();
  }

  before() {
    Config.clear();
    WatcherRegistrySpec.sandbox.restore();
  }

  @test
  async integration() {
    WatcherRegistrySpec.bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'system_0'},
        logging: {enable: true, level: 'debug', transports: [{console: {}}]},
        storage: {default: TEST_STORAGE_OPTIONS},
        watchers: [{
          type: 'file',
          name: 'dir1',
          path: '/tmp',
          event: 'event_name',
          task: {
            names: [
              'task_name',
            ],
            params: {
              foo: 'bar',
              lorem: 'ipsum',
            },
          },
        }],
      });

    WatcherRegistrySpec.bootstrap.activateLogger();
    WatcherRegistrySpec.bootstrap.activateErrorHandling();
    await WatcherRegistrySpec.bootstrap.prepareRuntime();
    await WatcherRegistrySpec.bootstrap.activateStorage();

    await WatcherRegistrySpec.bootstrap.startup();

    const watcherRegistry = Container.get(WatcherRegistry.NAME);
    const stopAllSpy = WatcherRegistrySpec.sandbox.on(watcherRegistry, 'stopAll');

    expect(stopAllSpy).not.to.have.been.called();
    await WatcherRegistrySpec.bootstrap.shutdown();
    expect(stopAllSpy).to.have.been.called();
  }

  @test
  async 'valid config'() {
    Config.set(WatcherRegistry.CONFIG_ENTRY, [{
      type: 'file',
      name: 'dir1',
      path: '/tmp',
      event: 'event_name',
      task: {
        names: [
          'task_name',
        ],
        params: {
          foo: 'bar',
          lorem: 'ipsum',
        },
      },
    }]);

    expect(() => {
      return new WatcherRegistry();
    }).not.to.throw();
  }

  @test
  async 'config not set'() {
    expect(() => {
      return new WatcherRegistry();
    }).not.to.throw();
  }

  @test
  async 'config not an array'() {
    Config.set(WatcherRegistry.CONFIG_ENTRY, 'foobar');

    expect(() => {
      return new WatcherRegistry();
    }).to.throw();
  }

  @test
  async 'invalid config entries'() {
    Config.set(WatcherRegistry.CONFIG_ENTRY, [{
      type: 'file',
      name: 'dir1',
      path: '/tmp',
    }]);

    expect(() => {
      return new WatcherRegistry();
    }).to.throw();
  }
}
