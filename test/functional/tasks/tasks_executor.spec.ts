import * as _ from 'lodash';
import {suite, test, timeout} from 'mocha-typescript';
import {expect} from 'chai';
import {SimpleTaskPromise} from './tasks/SimpleTaskPromise';
import {TestHelper} from '../TestHelper';
import {Bootstrap, Injector, ITypexsOptions} from '../../../src';
import {TaskExecutor} from '../../../src/libs/tasks/TaskExecutor';
import {TEST_STORAGE_OPTIONS} from '../config';
import {IEventBusConfiguration} from 'commons-eventbus';
import {SpawnHandle} from '../SpawnHandle';
import {TaskRequestFactory} from '../../../src/libs/tasks/worker/TaskRequestFactory';
import {ITaskRunnerResult} from '../../../src/libs/tasks/ITaskRunnerResult';
import {TaskEvent} from '../../../src/libs/tasks/worker/TaskEvent';


const LOG_EVENT = TestHelper.logEnable(true);

let bootstrap: Bootstrap;
const p: SpawnHandle[] = [];

@timeout(120000)
@suite('functional/tasks/task_executor')
class TasksSpec {

  static async before() {
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
        workers: {access: [{name: 'TaskQueueWorker', access: 'allow'}]}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();


    p[0] = SpawnHandle.do(__dirname + '/fake_app_task_exec/node_worker.ts')
      .nodeId('remote01').start(LOG_EVENT);
    await p[0].started;

    p[1] = SpawnHandle.do(__dirname + '/fake_app_task_exec/node_worker.ts')
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
    // console.log(results);
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

    await TestHelper.wait(500);

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
    console.log(results);
    expect((<any>results[0]).state).to.be.eq('stopped');
    expect((<any>results[1])).to.be.null;
  }


  @test
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
          targetId: 'remote02',
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
    // console.log(results);
    expect((<any>results[0][0]).state).to.be.eq('stopped');
    expect((<any>results[1])).to.be.null;
  }


  @test.skip
  async 'remote task on own node'() {


  }

  @test.skip
  async 'handling exception during task execution'() {

  }

  @test.skip
  async 'check incoming + outgoing'() {


  }


}
