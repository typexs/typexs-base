// import * as chai from 'chai';
// import {expect, should, use} from 'chai';
// import * as chaiAsPromised from 'chai-as-promised';
// import * as chaiSpies from 'chai-spies';
// import {unlinkSync, writeFileSync} from 'fs';
// import {slow, suite, test, timeout} from '@testdeck/mocha';
// import {FileWatcher} from '../../../src/libs/watchers/FileWatcher';
// import {Config} from '@allgemein/config';
// import Sandbox = ChaiSpies.Sandbox;
// import {Log} from '../../../src/libs/logging/Log';
// import {PlatformUtils} from '@allgemein/base';
//
// async function sleep(duration: number): Promise<void> {
//   return new Promise((resolve) => {
//     setTimeout(resolve, duration);
//   });
// }
//
// const tmpDir = '/tmp/watcher_test';
//
// @suite('functional/watchers/file_watcher')
// class FileWatcherSpec {
//   static sandbox: Sandbox;
//
//   static async before() {
//     if (PlatformUtils.fileExist(tmpDir)) {
//       await PlatformUtils.deleteDirectory(tmpDir);
//     }
//     await PlatformUtils.mkdir(tmpDir);
//
//     Config.clear();
//
//     use(chaiAsPromised);
//     use(chaiSpies);
//
//     should();
//
//     FileWatcherSpec.sandbox = chai.spy.sandbox();
//   }
//
//   before() {
//     FileWatcherSpec.sandbox.restore();
//   }
//
//   @test
//   async 'invalid config'() {
//     expect(() => {
//       return new FileWatcher({
//         type: 'file',
//         name: 'dir1',
//         path: tmpDir,
//       });
//     }).to.throw();
//   }
//
//   @test
//   async 'invalid watcher/path'() {
//     const fileWatcher = new FileWatcher({
//       type: 'file',
//       name: 'dir1',
//       path: '/not/existing/path',
//       event: 'foo',
//     });
//
//     expect(await fileWatcher.isValid()).to.be.false;
//   }
//
//   @test
//   async 'valid watcher/path'() {
//     const fileWatcher = new FileWatcher({
//       type: 'file',
//       name: 'dir1',
//       path: tmpDir,
//       event: 'foo',
//     });
//
//     expect(await fileWatcher.isValid()).to.be.true;
//   }
//
//   @test
//   async 'already started'() {
//     const fileWatcher = new FileWatcher({
//       type: 'file',
//       name: 'dir1',
//       path: tmpDir,
//       event: 'foo',
//     });
//
//     await fileWatcher.start().should.not.eventually.be.rejected;
//
//     await fileWatcher.start().should.eventually.be.rejected;
//
//     await fileWatcher.stop().should.not.eventually.be.rejected;
//   }
//
//   @test
//   async 'already stopped'() {
//     const fileWatcher = new FileWatcher({
//       type: 'file',
//       name: 'dir1',
//       path: tmpDir,
//       event: 'foo',
//     });
//
//     await fileWatcher.start().should.not.eventually.be.rejected;
//     await fileWatcher.stop().should.not.eventually.be.rejected;
//     await fileWatcher.stop().should.eventually.be.rejected;
//   }
//
//   @test
//   async 'trigger'() {
//     const fileWatcher = new FileWatcher({
//       type: 'file',
//       name: 'dir1',
//       path: tmpDir,
//       event: 'foo',
//     });
//
//     await fileWatcher.start();
//
//     const emitEventSpy = FileWatcherSpec.sandbox.on(fileWatcher, 'emitEvent', () => {
//       Log.info('EMIT');
//     });
//     const executeTasksSpy = FileWatcherSpec.sandbox.on(fileWatcher, 'executeTasks', () => {
//       Log.info('EXECUTE');
//     });
//
//     expect(emitEventSpy).not.to.have.been.called();
//     expect(executeTasksSpy).not.to.have.been.called();
//
//     writeFileSync(tmpDir + '/foo', 'lorem ipsum');
//
//     await sleep(2000);
//
//     expect(emitEventSpy).to.have.been.called();
//     expect(executeTasksSpy).to.have.been.called();
//
//     unlinkSync(tmpDir + '/foo');
//     await fileWatcher.stop();
//   }
// }
