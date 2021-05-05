// import * as chai from 'chai';
// import {expect, use} from 'chai';
// import * as chaiSpies from 'chai-spies';
// import {Config} from '@allgemein/config';
// import {slow, suite, test, timeout} from '@testdeck/mocha';
// import {Bootstrap} from '../../../src/Bootstrap';
// import {WatcherRegistry} from '../../../src/libs/watchers/WatcherRegistry';
// import {TEST_STORAGE_OPTIONS} from '../config';
// import {ITypexsOptions} from '../../../src/libs/ITypexsOptions';
// import {PlatformUtils} from '@allgemein/base';
// import Sandbox = ChaiSpies.Sandbox;
// import {Injector} from '../../../src/libs/di/Injector';
//
//
// const tmpDir = '/tmp/watcher_test';
//
//
// @suite('functional/watchers/watcher_registry')
// class WatcherRegistrySpec {
//   static bootstrap: Bootstrap;
//   static sandbox: Sandbox;
//
//   static before() {
//     Bootstrap.reset();
//     Injector.reset();
//     Config.clear();
//
//     use(chaiSpies);
//     WatcherRegistrySpec.sandbox = chai.spy.sandbox();
//   }
//
//   async before() {
//     if (PlatformUtils.fileExist(tmpDir)) {
//       await PlatformUtils.deleteDirectory(tmpDir);
//     }
//     await PlatformUtils.mkdir(tmpDir);
//
//     Config.clear();
//     WatcherRegistrySpec.sandbox.restore();
//   }
//
//   @test
//   async integration() {
//
//     WatcherRegistrySpec.bootstrap = Bootstrap
//       .setConfigSources([{type: 'system'}])
//       .configure(<ITypexsOptions & any>{
//         app: {name: 'test', nodeId: 'system_0'},
//         logging: {enable: true, level: 'debug', transports: [{console: {}}]},
//         storage: {default: TEST_STORAGE_OPTIONS},
//         modules: {
//           disableCache: true
//         },
//         // random: new Date(),
//         watchers: [{
//           type: 'file',
//           name: 'dir1',
//           path: tmpDir,
//           event: 'event_name',
//           task: {
//             names: [
//               'task_name',
//             ],
//             params: {
//               foo: 'bar',
//               lorem: 'ipsum',
//             },
//           },
//         }],
//       });
//
//
//     WatcherRegistrySpec.bootstrap.activateLogger();
//     WatcherRegistrySpec.bootstrap.activateErrorHandling();
//     await WatcherRegistrySpec.bootstrap.prepareRuntime();
//     await WatcherRegistrySpec.bootstrap.activateStorage();
//
//     await WatcherRegistrySpec.bootstrap.startup();
//
//
//     // const watcherRegistry = Injector.get(WatcherRegistry.NAME);
//     // const stopAllSpy = WatcherRegistrySpec.sandbox.on(watcherRegistry, 'stopAll');
//     //
//     // expect(stopAllSpy).not.to.have.been.called();
//     await WatcherRegistrySpec.bootstrap.onShutdown();
//     // expect(stopAllSpy).to.have.been.called();
//   }
//
//   @test
//   async 'valid config'() {
//     Config.set(WatcherRegistry.CONFIG_ENTRY, [{
//       type: 'file',
//       name: 'dir1',
//       path: tmpDir,
//       event: 'event_name',
//       task: {
//         names: [
//           'task_name',
//         ],
//         params: {
//           foo: 'bar',
//           lorem: 'ipsum',
//         },
//       },
//     }]);
//
//     expect(() => {
//       return new WatcherRegistry();
//     }).not.to.throw();
//   }
//
//   @test
//   async 'config not set'() {
//     expect(() => {
//       return new WatcherRegistry();
//     }).not.to.throw();
//   }
//
//   @test
//   async 'config not an array'() {
//     Config.set(WatcherRegistry.CONFIG_ENTRY, 'foobar');
//
//     expect(() => {
//       return new WatcherRegistry();
//     }).to.throw();
//   }
//
//   @test
//   async 'invalid config entries'() {
//     Config.set(WatcherRegistry.CONFIG_ENTRY, [{
//       type: 'file',
//       name: 'dir1',
//       path: tmpDir,
//     }]);
//
//     expect(() => {
//       return new WatcherRegistry();
//     }).to.throw();
//   }
// }
