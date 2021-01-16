import * as _ from 'lodash';
import {suite, test, timeout} from '@testdeck/mocha';
import {expect} from 'chai';
import {SimpleTaskPromise} from './tasks/SimpleTaskPromise';
import {TestHelper} from '../TestHelper';
import {TaskExecutor} from '../../../src/libs/tasks/TaskExecutor';
import {TEST_STORAGE_OPTIONS} from '../config';
import {IEventBusConfiguration} from 'commons-eventbus';
import {SpawnHandle} from '../SpawnHandle';
import {TaskRequestFactory} from '../../../src/libs/tasks/worker/TaskRequestFactory';
import {ITaskRunnerResult} from '../../../src/libs/tasks/ITaskRunnerResult';
import {TaskEvent} from '../../../src/libs/tasks/worker/TaskEvent';
import {Bootstrap} from '../../../src/Bootstrap';
import {ITypexsOptions} from '../../../src/libs/ITypexsOptions';
import {Injector} from '../../../src/libs/di/Injector';
import {StorageRef} from '../../../src/libs/storage/StorageRef';
import {TaskLog} from '../../../src/entities/TaskLog';
import {C_STORAGE_DEFAULT} from '../../../src/libs/Constants';


const LOG_EVENT = TestHelper.logEnable(false);

let bootstrap: Bootstrap;
const p: SpawnHandle[] = [];


@suite('functional/tasks/task_executor')
class TasksSpec {

  static async before() {
    Bootstrap.reset();
    await TestHelper.clearCache();

    const nodeId = 'system_0';
    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {
          name: 'test',
          nodeId: nodeId,
          path: __dirname + '/fake_app_task_exec'
        },
        logging: {enable: LOG_EVENT, level: 'debug', loggers: [{name: '*', level: 'debug'}]},
        modules: {paths: [__dirname + '/../../..']},
        storage: {default: TEST_STORAGE_OPTIONS},
        eventbus: {
          default: <IEventBusConfiguration>{
            adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}
          }
        },
        workers: {
          access: [
            {name: 'TaskQueueWorker', access: 'allow'},
            {name: 'ExchangeMessageWorker', access: 'allow'}
          ]
        }
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();


    p[0] = SpawnHandle
      .do(__dirname + '/fake_app_task_exec/node_worker.ts')
      .nodeId('remote01').start(LOG_EVENT);
    await p[0].started;

    p[1] = SpawnHandle
      .do(__dirname + '/fake_app_task_exec/node_worker.ts')
      .nodeId('remote02').start(LOG_EVENT);
    await p[1].started;

    await TestHelper.wait(500);
  }


  static async after() {
    if (bootstrap) {
      await bootstrap.shutdown();

      if (p.length > 0) {
        p.map(x => x.shutdown());
        await Promise.all(p.map(x => x.done));
      }
    }
  }


  /**
   * Check local execution of a task
   */
  @test
  async 'locally task execution'() {
    const executor = Injector.create(TaskExecutor);
    const data = await executor.create(
      ['simple_task_promise'],
      {},
      {
        isLocal: true,
        skipTargetCheck: true,
      }).run() as ITaskRunnerResult;

    expect(data.results).to.not.be.empty;
    const x = data.results.find(
      (x: any) => x.name === _.snakeCase('SimpleTaskPromise'));
    expect(x.name).to.be.eq(_.snakeCase('SimpleTaskPromise'));
    expect(x.result).to.be.eq('test');

    await TestHelper.wait(100);
    const runnerId = data.id;

    //
    // Check if tasks status was saved correctly
    //
    const storageRef = Injector.get(C_STORAGE_DEFAULT) as StorageRef;
    const found = await storageRef.getController().findOne(TaskLog, {tasksId: runnerId});

    expect(found).to.be.instanceOf(TaskLog);
    expect(found).to.deep.include({
      tasksId: runnerId,
      taskName: 'simple_task_promise',
      taskNr: 0,
      state: 'stopped',
      nodeId: 'system_0',
      respId: 'system_0',
      hasError: false,
      progress: 100,
      total: 100,
      done: true,
      running: false,
      weight: 0,

    });
  }


  @test
  async 'remote task on own node'() {
    const executor1 = Injector.create(TaskExecutor);
    const data = await executor1
      .create(
        [
          'simple_task_promise'
        ],
        {},
        {
          targetId: 'system_0',
          skipTargetCheck: true,
        })
      .run() as ITaskRunnerResult[];

    expect(data).to.have.length(1);
    const entry = data.shift();
    expect(entry.results).to.not.be.empty;
    const x = entry.results.find(
      (x: any) => x.name === _.snakeCase('SimpleTaskPromise'));
    expect(x.name).to.be.eq(_.snakeCase('SimpleTaskPromise'));
    expect(x.result).to.be.eq('test');

    await TestHelper.wait(100);
    const runnerId = entry.id;
    //
    // Check if tasks status was saved correctly
    //
    const storageRef = Injector.get(C_STORAGE_DEFAULT) as StorageRef;
    const found = await storageRef.getController().findOne(TaskLog, {tasksId: runnerId});

    expect(found).to.be.instanceOf(TaskLog);
    expect(found).to.deep.include({
      tasksId: runnerId,
      taskName: 'simple_task_promise',
      taskNr: 0,
      state: 'stopped',
      nodeId: 'system_0',
      respId: 'system_0',
      hasError: false,
      progress: 100,
      total: 100,
      done: true,
      running: false,
      weight: 0,

    });
  }


  @test
  async 'remote task without results'() {
    const executor1 = Injector.create(TaskExecutor);
    const data = await executor1
      .create(
        [
          'simple_task_promise'
        ],
        {},
        {
          waitForRemoteResults: false,
          targetId: 'system_0',
          skipTargetCheck: true,
        })
      .run() as TaskEvent[];

    expect(data).to.have.length(1);
    const entry = data.shift();
    expect(entry.state).to.be.eq('enqueue');
    expect(entry.topic).to.be.eq('data');
    expect(entry.nodeId).to.be.eq('system_0');
    expect(entry.respId).to.be.eq('system_0');
  }


  @test
  async 'remote task on not existing node'() {
    const executor1 = Injector.create(TaskExecutor);
    let error = null;
    try {

      const data = await executor1
        .create(
          [
            'simple_task_promise'
          ],
          {},
          {
            targetId: 'not_there',
            skipTargetCheck: true,
          })
        .run() as ITaskRunnerResult[];
      expect(true).to.be.false;
    } catch (e) {
      error = e;
    }
    expect(error.message).to.be.eq('no enqueue responses arrived');

  }


  @test
  async 'remote task execution on single node (with results and targetId)'() {
    const executor = Injector.create(TaskExecutor);
    const data = await executor
      .create(
        ['simple_task_promise'],
        {},
        {
          waitForRemoteResults: true,
          targetId: 'remote01',
          skipTargetCheck: true,
        })
      .run() as ITaskRunnerResult[];

    expect(data).to.have.length(1);
    const entry = data.shift();
    expect(entry.results).to.not.be.empty;
    const x = entry.results.find(
      (x: any) => x.name === _.snakeCase('SimpleTaskPromise'));
    expect(x.name).to.be.eq(_.snakeCase('SimpleTaskPromise'));
    expect(x.result).to.be.eq('test');

    await TestHelper.wait(100);
    const runnerId = entry.id;
    //
    // Task shouldn't be local
    //
    const storageRef = Injector.get(C_STORAGE_DEFAULT) as StorageRef;
    const found = await storageRef.getController().findOne(TaskLog, {tasksId: runnerId});
    expect(found).to.be.null;

    //
    // Task status get from remote
    //
    // const results = await Injector.get(TasksExchange).getStatus(runnerId, {
    //   targetIds: ['remote01'],
    //   // outputMode: 'only_value',
    //   skipLocal: true
    // });
    // // console.log(inspect(results, false, 10));
    // expect(results).to.have.length(1);
    // expect(results.shift()).to.deep.include({
    //   taskName: 'simple_task_promise',
    //   taskNr: 0,
    //   state: 'stopped',
    //   callerId: 'system_0',
    //   nodeId: 'remote01',
    //   respId: 'remote01',
    //   hasError: false,
    //   progress: 100,
    //   total: 100,
    //   done: true,
    //   running: false,
    //   weight: 0,
    //   data: {results: 'test', incoming: {}, outgoing: {}, error: null}
    // });
  }


  @test
  async 'remote task execution on single node (with results and targetIds)'() {
    const executor = Injector.create(TaskExecutor);
    const data = await executor
      .create(
        ['simple_task_promise'],
        {},
        {
          waitForRemoteResults: true,
          targetIds: ['remote01'],
          skipTargetCheck: true,
        })
      .run() as ITaskRunnerResult[];

    expect(data).to.have.length(1);
    const entry = data.shift();
    expect(entry.results).to.not.be.empty;
    const x = entry.results.find(
      (x: any) => x.name === _.snakeCase('SimpleTaskPromise'));
    expect(x.name).to.be.eq(_.snakeCase('SimpleTaskPromise'));
    expect(x.result).to.be.eq('test');
  }


  @test
  async 'remote task execution on single node by task execution exchange with future'() {
    const factory = Injector.get(TaskRequestFactory);
    const exchange = factory.executeRequest();
    // exchange.
    const message = await exchange.create([
        'simple_task_promise'
      ],
      {},
      {
        targetIds: ['remote01'],
        skipTargetCheck: true,
      });
    const future = await message.future();
    const events = await message.run() as TaskEvent[];

    const results = await future.await() as ITaskRunnerResult[];
    //
    // const future = exchange.taskFuture();
    //
    expect(events).to.have.length(1);
    expect(events[0].state).to.be.eq('enqueue');
    expect(results).to.have.length(1);
    const entry = results.shift();
    expect(entry.results).to.not.be.empty;
    const x = entry.results.find(
      (x: any) => x.name === _.snakeCase('SimpleTaskPromise'));
    expect(x.name).to.be.eq(_.snakeCase('SimpleTaskPromise'));
    expect(x.result).to.be.eq('test');
  }


  @test
  async 'remote task on multiple nodes (on 3 nodes)'() {
    const executor = Injector.create(TaskExecutor);
    const data = await executor
      .create(
        ['simple_task_promise'],
        {},
        {
          waitForRemoteResults: true,
          remote: true,
          executeOnMultipleNodes: 3,
          skipTargetCheck: true,
        })
      .run() as ITaskRunnerResult[];

    expect(data).to.have.length(3);
    const nodeIds = data.map(x => x.nodeId).sort();
    expect(nodeIds).to.be.deep.eq(['remote01', 'remote02', 'system_0']);

    for (const entry of data) {
      expect(entry.results).to.not.be.empty;
      const x = entry.results.find(
        (x: any) => x.name === _.snakeCase('SimpleTaskPromise'));
      expect(x.name).to.be.eq(_.snakeCase('SimpleTaskPromise'));
      expect(x.result).to.be.eq('test');
    }
  }

  @test
  async 'remote task on random nodes'() {
    const executor = Injector.create(TaskExecutor);
    const data = await executor
      .create(
        ['simple_task_promise'],
        {},
        {
          waitForRemoteResults: true,
          remote: true,
          randomWorkerSelection: true,
          skipTargetCheck: true,
        })
      .run() as ITaskRunnerResult[];

    expect(data).to.have.length(1);
    const nodeId = data[0].nodeId;
    expect(nodeId).to.be.oneOf(['system_0', 'remote01', 'remote02']);

    for (const entry of data) {
      expect(entry.results).to.not.be.empty;
      const x = entry.results.find(
        (x: any) => x.name === _.snakeCase('SimpleTaskPromise'));
      expect(x.name).to.be.eq(_.snakeCase('SimpleTaskPromise'));
      expect(x.result).to.be.eq('test');
    }

  }


  @test
  async 'error missing incoming'() {
    const executor1 = Injector.create(TaskExecutor);
    let error = null;
    try {
      const entry = await executor1
        .create(
          [
            'simple_in_out_task'
          ],
          {},
          {
            targetId: 'remote01',
            skipTargetCheck: true,
            // timeout: 30000
          })
        .run() as ITaskRunnerResult[];
      expect(true).to.be.false;
    } catch (e) {
      error = e;
    }
    expect(error.message).to.be.eq('The required value is not passed. data: {"required":"income"}');

  }

  @test
  async 'check incoming + outgoing'() {
    const executor1 = Injector.create(TaskExecutor);
    const entry = await executor1
      .create(
        [
          'simple_in_out_task'
        ],
        {income: 'hallo welt '},
        {
          targetId: 'remote01',
          skipTargetCheck: true,
          // timeout: 30000
        })
      .run() as ITaskRunnerResult[];

    expect(entry).to.have.length(1);
    const data = entry.shift();
    expect(data.results).to.have.length(1);
    expect(data.results.shift()).to.deep.include({
      incoming: {income: 'hallo welt '},
      outgoing: {output: 'hallo welt hallo welt hallo welt'},
    });

  }

  @test
  async 'concurrency on same node'() {
    const executor1 = Injector.create(TaskExecutor);
    const executor2 = Injector.create(TaskExecutor);
    const running1 = executor1
      .create(
        ['simple_task_running'],
        {},
        {
          executionConcurrency: 1,
          waitForRemoteResults: true,
          targetId: 'system_0',
          skipTargetCheck: true,
        })
      .run();

    await TestHelper.wait(500);

    const running2 = executor2
      .create(
        ['simple_task_running'],
        {},
        {
          executionConcurrency: 1,
          waitForRemoteResults: true,
          targetId: 'system_0',
          skipTargetCheck: true,
        })
      .run();

    const results = await Promise.all([
      running1,
      running2
    ]);

    expect(executor1.isExecuteable()).to.be.true;
    expect(executor2.isExecuteable()).to.be.false;
    expect(results).to.have.length(2);
    expect((<any>results[0][0]).state).to.be.eq('stopped');
    expect((<any>results[1])).to.be.null;
  }


  @test
  async 'concurrency on local node'() {
    const executor1 = Injector.create(TaskExecutor);
    const executor2 = Injector.create(TaskExecutor);
    const running1 = executor1
      .create(
        ['simple_task_running'],
        {},
        {
          executionConcurrency: 1,
          isLocal: true,
          skipTargetCheck: true,
        })
      .run();

    await TestHelper.wait(1000);

    const running2 = executor2
      .create(
        ['simple_task_running'],
        {},
        {
          executionConcurrency: 1,
          isLocal: true,
          skipTargetCheck: true,
        })
      .run();

    const results = await Promise.all([
      running1,
      running2
    ]);

    expect(executor1.isExecuteable()).to.be.true;
    expect(executor2.isExecuteable()).to.be.false;
    expect(results).to.have.length(2);
    expect((<any>results[0]).state).to.be.eq('stopped');
    expect((<any>results[1])).to.be.null;
  }


  /**
   * TODO fix this unrelieable functionality
   */
  @test.skip
  async 'concurrency on different nodes'() {
    const executor1 = Injector.create(TaskExecutor);
    const executor2 = Injector.create(TaskExecutor);
    const running1 = executor1
      .create(
        ['simple_task_running'],
        {},
        {
          executionConcurrency: 1,
          waitForRemoteResults: true,
          targetId: 'remote01',
          skipTargetCheck: true,
          timeout: 10000
        })
      .run();

    await TestHelper.wait(2000);

    const running2 = executor2
      .create(
        ['simple_task_running'],
        {},
        {
          executionConcurrency: 1,
          waitForRemoteResults: true,
          targetId: 'remote02',
          skipTargetCheck: true,
          timeout: 10000
        })
      .run();

    const results = await Promise.all([
      running1,
      running2
    ]);

    expect(executor1.isExecuteable()).to.be.true;
    expect(executor2.isExecuteable()).to.be.false;
    expect(results).to.have.length(2);
    expect((<any>results[0][0]).state).to.be.eq('stopped');
    expect((<any>results[1])).to.be.null;
  }


  @test
  async 'handling remote exception during task execution'() {
    const executor1 = Injector.create(TaskExecutor);
    const data = await executor1
      .create(
        [
          'simple_task_exception_running'
        ],
        {},
        {
          remote: true,
          skipTargetCheck: true,
        })
      .run() as ITaskRunnerResult[];

    expect(data).to.have.length(1);
    const entry = data.shift();
    const data1 = entry.results.shift();
    expect(data1).to.be.deep.include({
      has_error: true,
    });

    expect(data1.error).to.be.deep.include({
      message: 'test error',
      className: 'Error'
    });
    expect(data1.error.stack).to.have.length.gte(3);
  }


  @test
  async 'handling local exception during task execution'() {
    const executor1 = Injector.create(TaskExecutor);
    const entry = await executor1
      .create(
        [
          'simple_task_exception_running'
        ],
        {},
        {
          isLocal: true,
        })
      .run() as ITaskRunnerResult;

    const data1 = entry.results.shift();
    expect(data1).to.be.deep.include({
      has_error: true,
    });

    expect(data1.error).to.be.deep.include({
      message: 'test error',
      className: 'Error'
    });
    expect(data1.error.stack).to.have.length.gte(3);
  }


}
