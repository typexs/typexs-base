import * as _ from 'lodash';
import {suite, test} from 'mocha-typescript';
import * as path from 'path';
import {Bootstrap} from '../../../../src/Bootstrap';
import {Config} from 'commons-config';
import {TestHelper} from '../../TestHelper';
import {SpawnHandle} from '../../SpawnHandle';
import {Injector} from '../../../../src/libs/di/Injector';
import {expect} from 'chai';
import {TasksExchange} from '../../../../src/adapters/exchange/tasks/TasksExchange';


const LOG_EVENT = TestHelper.logEnable(false);

let bootstrap: Bootstrap;
let spawned: SpawnHandle;

@suite('functional/messaging/tasks/exchange_spawn')
class MessagingSpec {


  static async before() {
    Bootstrap.reset();
    Config.clear();
    spawned = SpawnHandle.do(__dirname + '/fake_app/node_01.ts').start(LOG_EVENT);

    const appdir = path.join(__dirname, 'fake_app');

    bootstrap = await Bootstrap.configure(
      {
        app: {
          path: appdir
        },
        logging: {
          enable: LOG_EVENT
        },
        modules: {
          paths: [
            __dirname + '/../../../..'
          ]
        },
      }
    );
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
  async 'get log file path from remote only'() {
    const exchange = Injector.get(TasksExchange);
    const results = await exchange.getLogFilePath('abcdef', {filterErrors: true, skipLocal: true});
    expect(results).to.have.length(1);
    expect(results[0]).to.be.eq(__dirname + '/fake_app/logs/taskmonitor-abcdef-remote_fakeapp01.log');
  }


  @test
  async 'get log file path from local and remote only'() {
    const exchange = Injector.get(TasksExchange);
    const results = await exchange.getLogFilePath('abcdef', {filterErrors: true});
    expect(results).to.have.length(2);
    expect(results.sort()).to.be.deep.eq([
      __dirname + '/fake_app/logs/taskmonitor-abcdef-remote_fakeapp01.log',
      __dirname + '/fake_app/logs2/taskmonitor-abcdef-fake_app.log'
    ].sort());
  }


  @test
  async 'get log file path as map from local and remote only'() {
    const exchange = Injector.get(TasksExchange);
    const results = await exchange.getLogFilePath('abcdef', {filterErrors: true, mode: 'map'});
    expect(_.keys(results)).to.have.length(2);
    const new2 = {};
    _.keys(results).sort().map(x => {
      new2[x] = results[x];
    });
    expect(new2).to.be.deep.eq({
      'fake_app:0': __dirname + '/fake_app/logs2/taskmonitor-abcdef-fake_app.log',
      'remote_fakeapp01:0': __dirname + '/fake_app/logs/taskmonitor-abcdef-remote_fakeapp01.log',
    });
  }


  @test
  async 'get log file path with errors'() {
    const exchange = Injector.get(TasksExchange);
    const results = await exchange.getLogFilePath('abcdef2', {});
    expect(results).to.have.length(2);
    expect(results.map(x => x['message'])).to.be.deep.eq([
      'file for runner abcdef2 not found',
      'file for runner abcdef2 not found',
    ]);
  }


  @test
  async 'get log file path with filtered errors'() {
    const exchange = Injector.get(TasksExchange);
    const results = await exchange.getLogFilePath('abcdef2', {filterErrors: true});
    expect(results).to.have.length(0);
    expect(results).to.be.deep.eq([]);
  }


  @test
  async 'get log file path with errors raw'() {
    const exchange = Injector.get(TasksExchange);
    const results = await exchange.getLogFilePath('abcdef2', {filterErrors: false, skipLocal: true, mode: 'raw'});
    expect(results).to.have.length(1);
    expect(results[0]).to.be.deep.include({
        '__nodeId__': 'remote_fakeapp01',
        'error': {
          'message': 'file for runner abcdef2 not found',
          'name': 'Error'
        },
        'instNr': 0,
        'nodeId': 'remote_fakeapp01',
        'op': 'logfile',
        'seqNr': 0,
        'targetIds': [
          'fake_app',
        ]
      }
    );
  }


  @test
  async 'get log file path with errors entries'() {
    // const exchange = Injector.get(TasksExchange);
    // const results = await exchange.getLogFilePath('abcdef2', {filterErrors: false, skipLocal: true, mode: 'raw'});
    // expect(results).to.have.length(1);
    // expect(results[0]).to.be.deep.include({
    //     '__nodeId__': 'remote_fakeapp01',
    //     'error': {
    //       'message': 'file for runner abcdef2 not found',
    //       'name': 'Error'
    //     },
    //     'instNr': 0,
    //     'nodeId': 'remote_fakeapp01',
    //     'op': 'logfile',
    //     'seqNr': 0,
    //     'targetIds': [
    //       'fake_app',
    //     ]
    //   }
    // );
  }

}

