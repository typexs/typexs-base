// process.env.SQL_LOG = '1';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from '@allgemein/config';
import {TEST_STORAGE_OPTIONS} from '../config';
import {IEventBusConfiguration} from 'commons-eventbus';
import {TestHelper} from '../TestHelper';
import {ITypexsOptions} from '../../../src/libs/ITypexsOptions';
import {SpawnHandle} from '../SpawnHandle';
import {System} from '../../../src/libs/system/System';
import {Injector} from '../../../src/libs/di/Injector';
import {ConfigUtils} from '../../../src/libs/utils/ConfigUtils';
import {C_CONFIG, C_KEY_SEPARATOR} from '../../../src/libs/Constants';
import {Cache} from '../../../src/libs/cache/Cache';


const LOG_EVENT = TestHelper.logEnable(false);
let bootstrap: Bootstrap;

@suite('functional/config/config_redis')
class ConfigRedisSpec {


  async before() {
    // TestHelper.typeOrmRestore();
    await TestHelper.clearCache();
    Bootstrap.reset();
    Config.clear();
  }

  async after() {
    if (bootstrap) {
      await bootstrap.shutdown();
      // await bootstrap.getStorage().shutdown();
      bootstrap = null;

    }
  }

  @test
  async 'node register and unregister'() {
    const p = SpawnHandle.do(__dirname + '/fake_app/node.ts').start(LOG_EVENT);

    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'system', path: __dirname + '/fake_app'},
        logging: {enable: LOG_EVENT, level: 'debug', loggers: [{name: '*', level: 'debug', enable: true}]},
        modules: {paths: [__dirname + '/../../..'], disableCache: true},
        storage: {default: TEST_STORAGE_OPTIONS},
        cache: {bins: {default: 'redis1'}, adapter: {redis1: {type: 'redis', host: '127.0.0.1', port: 6380}}},
        eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();

    const system = Injector.get(System.NAME) as System;
    const cache = Injector.get(Cache.NAME) as Cache;
    const beforeNodes = system.getAllNodes();

    await p.started;

    const afterNodes = system.getAllNodes();

    const config = (await Promise.all(
      afterNodes.map(x =>
        cache.get([C_CONFIG, x.nodeId].join(C_KEY_SEPARATOR))
      )
    ));

    const config2 = (await Promise.all(
      afterNodes.map(x =>
        ConfigUtils.getCached(x.nodeId, 'app')
      )
    ));

    p.shutdown();
    await p.done;

    expect(beforeNodes).to.have.length(1);
    expect(afterNodes).to.have.length(2);
    expect(config.map((x: any) => x.app)).to.deep.eq([
      {
        'name': 'test',
        'nodeId': 'system',
        'path': __dirname + '/fake_app'
      },
      {
        'name': 'fakeapp01',
        'nodeId': 'fakeapp01',
        'path': __dirname + '/fake_app'
      }
    ]);
    expect(config2).to.deep.eq([
      {
        'name': 'test',
        'nodeId': 'system',
        'path': __dirname + '/fake_app'
      },
      {
        'name': 'fakeapp01',
        'nodeId': 'fakeapp01',
        'path': __dirname + '/fake_app'
      }
    ]);
  }



  // @test
  // async 'check own node info'() {
  //   bootstrap = Bootstrap
  //     .setConfigSources([{type: 'system'}])
  //     .configure(<ITypexsOptions & any>{
  //       app: {name: 'test', nodeId: 'system', path: __dirname + '/fake_app'},
  //       logging: {enable: LOG_EVENT, level: 'debug', loggers: [{name: '*', level: 'debug', enable: true}]},
  //       modules: {paths: [__dirname + '/../../..']},
  //       storage: {default: TEST_STORAGE_OPTIONS},
  //       cache: {bins: {default: 'redis1'}, adapter: {redis1: {type: 'redis', host: '127.0.0.1', port: 6379}}},
  //       eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}}
  //     });
  //   bootstrap.activateLogger();
  //   bootstrap.activateErrorHandling();
  //
  //   await bootstrap.prepareRuntime();
  //   bootstrap = await bootstrap.activateStorage();
  //   bootstrap = await bootstrap.startup();
  //
  //   const system: System = Container.get(System.NAME);
  //   expect(system.node.state).to.eq('idle');
  //
  //   await bootstrap.onShutdown();
  //   expect(system.node.nodeId).to.eq('system');
  //   expect(system.node.state).to.eq('unregister');
  // }


  // @test
  // async 'check system information'() {
  //   bootstrap = Bootstrap
  //     .setConfigSources([{type: 'system'}])
  //     .configure(<ITypexsOptions & any>{
  //       app: {name: 'test', nodeId: 'system', path: __dirname + '/fake_app'},
  //       logging: {enable: LOG_EVENT, level: 'debug'},
  //       modules: {paths: [__dirname + '/../../..']},
  //       storage: {default: TEST_STORAGE_OPTIONS},
  //       cache: {bins: {default: 'redis1'}, adapter: {redis1: {type: 'redis', host: '127.0.0.1', port: 6379}}},
  //       eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}}
  //     });
  //   bootstrap.activateLogger();
  //   bootstrap.activateErrorHandling();
  //   await bootstrap.prepareRuntime();
  //   bootstrap = await bootstrap.activateStorage();
  //   bootstrap = await bootstrap.startup();
  //
  //   const system: System = Container.get(System.NAME);
  //
  //   expect(system.info).to.not.be.null;
  //   expect(system.info.networks).to.not.be.null;
  //   expect(system.info.cpus).to.not.be.null;
  //   expect(system.info.uptime).to.be.gt(0);
  //
  //   const p = SpawnHandle.do(__dirname + '/fake_app/node.ts').start(LOG_EVENT);
  //   await p.started;
  //   await TestHelper.wait(100);
  //
  //   const results = await system.getNodeInfos();
  //   expect(results).to.have.length(1);
  //   expect(results[0].machineId).to.be.eq(system.info.machineId);
  //
  //   p.onShutdown();
  //   await p.done;
  //
  // }


}

