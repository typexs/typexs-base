import {suite, test} from 'mocha-typescript';
import * as path from 'path';
import {Bootstrap} from '../../../../src/Bootstrap';
import {Config} from 'commons-config';
import {TestHelper} from '../../TestHelper';
import {SpawnHandle} from '../../SpawnHandle';
import {Injector} from '../../../../src/libs/di/Injector';
import {Log} from '../../../../src/libs/logging/Log';
import {FileUtils} from 'commons-base';
import {expect} from 'chai';
import {FileSystemExchange} from '../../../../src/adapters/exchange/filesystem/FileSystemExchange';


const LOG_EVENT = TestHelper.logEnable(false);

let bootstrap: Bootstrap;
let spawned: SpawnHandle;

@suite('functional/messaging/fs/exchange_spawn')
class MessagingSpec {


  static async before() {
    Bootstrap.reset();
    Config.clear();
    Log.enable = true;
    spawned = SpawnHandle.do(__dirname + '/fake_app/node_01.ts').start(LOG_EVENT);

    const appdir = path.join(__dirname, 'fake_app');

    bootstrap = await Bootstrap.configure(
      {
        app: {
          path: appdir
        },
        modules: {
          paths: [
            __dirname + '/../../../..'
          ]
        }
      }
    );
    await bootstrap.activateLogger();
    await bootstrap.prepareRuntime();
    await bootstrap.activateStorage();
    await bootstrap.startup();
    await spawned.started;
    await TestHelper.wait(50);

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
  async 'read remote file'() {
    const filePath = __dirname + '/fake_app/test.txt';
    const exchange = Injector.get(FileSystemExchange);
    const results = await exchange.file({path: filePath});

    expect(results).to.have.length(1);
    const data = results[0].toString();

    const fileContent = await FileUtils.readFile(filePath);
    expect(data).to.be.eq(fileContent.toString());
  }


  @test
  async 'read remote file - tail'() {
    const filePath = __dirname + '/fake_app/test.txt';
    const exchange = Injector.get(FileSystemExchange);
    const results = await exchange.file({path: filePath, tail: 1, unit: 'line'});
    expect(results).to.have.length(1);
    const data = results[0];
    expect(data).to.be.eq('interessanter Test\n');
  }


  @test
  async 'read remote file - less'() {
    const filePath = __dirname + '/fake_app/test.txt';
    const exchange = Injector.get(FileSystemExchange);
    const results = await exchange.file({path: filePath, offset: 2, limit: 1, unit: 'line'});
    expect(results).to.have.length(1);
    const data = results[0];
    expect(data).to.be.eq('das ist ein');
  }


  @test
  async 'read remote file - stats'() {
    const filePath = __dirname + '/fake_app/test.txt';
    const exchange = Injector.get(FileSystemExchange);
    const results = await exchange.file({path: filePath, stats: true});
    expect(results).to.have.length(1);
    const data = results[0];
    const fileContent = await FileUtils.readFile(filePath);
    expect(data.data.toString()).to.be.eq(fileContent.toString());
    expect(data.stats).to.include({
      'isBlockDevice': false,
      'isCharacterDevice': false,
      'isDirectory': false,
      'isFIFO': false,
      'isFile': true,
      'isSocket': false,
      'isSymbolicLink': false,
      'size': 44,
    });
  }


  @test
  async 'read remote directory'() {
    const filePath = __dirname + '/fake_app';
    const exchange = Injector.get(FileSystemExchange);
    const results = await exchange.file({path: filePath});
    expect(results).to.have.length(1);
    const data = results[0];

    // const fileContent = await FileUtils.readFile(filePath);
    expect(data).to.be.deep.eq([
      'config',
      'node_01.ts',
      'package.json',
      'test.txt'
    ]);

  }

  @test
  async 'read remote directory with stats'() {
    const filePath = __dirname + '/fake_app';
    const exchange = Injector.get(FileSystemExchange);
    const results = await exchange.file({path: filePath, stats: true});
    expect(results).to.have.length(1);
    const data = results[0] as any[];

    // const fileContent = await FileUtils.readFile(filePath);
    expect(data.map(x => {
      return {path: x.path, size: x.stats.size, isFile: x.stats.isFile};
    })).to.be.deep.eq([
      {
        'isFile': false,
        'path': 'config',
        'size': 4096,
      },
      {
        'isFile': true,
        'path': 'node_01.ts',
        'size': 1791,
      },
      {
        'isFile': true,
        'path': 'package.json',
        'size': 90
      },
      {
        'isFile': true,
        'path': 'test.txt',
        'size': 44
      }
    ]);

  }


}
