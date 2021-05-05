import * as _ from 'lodash';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';

import {Bootstrap} from '../../../src/Bootstrap';
import {Container} from 'typedi';
import {Config} from '@allgemein/config';
import {TEST_STORAGE_OPTIONS} from '../config';
import {EventBus, IEventBusConfiguration, subscribe} from 'commons-eventbus';
import {TaskQueueWorker} from '../../../src/workers/TaskQueueWorker';
import {SimpleWorkerTask} from './tasks/SimpleWorkerTask';
import {TaskEvent} from '../../../src/libs/tasks/worker/TaskEvent';
import {TestHelper} from '../TestHelper';
import {SpawnHandle} from '../SpawnHandle';
import {TaskCommand} from '../../../src/commands/TaskCommand';
import {SimpleTaskWithLog} from './tasks/SimpleTaskWithLog';
import {TaskRequestFactory} from '../../../src/libs/tasks/worker/TaskRequestFactory';
import {TaskMonitorWorker} from '../../../src/workers/TaskMonitorWorker';
import {ITypexsOptions} from '../../../src/libs/ITypexsOptions';
import {Tasks} from '../../../src/libs/tasks/Tasks';
import {Workers} from '../../../src/libs/worker/Workers';
import {C_STORAGE_DEFAULT} from '../../../src/libs/Constants';
import {TaskLog} from '../../../src/entities/TaskLog';
import {StorageRef} from '../../../src/libs/storage/StorageRef';
import {Injector} from '../../../src/libs/di/Injector';


const LOG_EVENT = TestHelper.logEnable(false);
let bootstrap: Bootstrap = null;

@suite('functional/tasks/tasks_worker')
class TasksWorkerSpec {


  async before() {
    await TestHelper.clearCache();
    Bootstrap.reset();
    Config.clear();
  }


  async after() {
    if (bootstrap) {
      await bootstrap.shutdown();
    }
  }


  @test
  async 'run manuell task by triggering event on local worker'() {
    const NODEID = 'worker';
    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: NODEID},
        logging: {enable: LOG_EVENT, level: 'debug'},
        modules: {paths: [__dirname + '/../../..'], disableCache: true},
        storage: {default: TEST_STORAGE_OPTIONS},
        eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}},
        // workers: {access: [{name: 'TaskMonitorWorker', access: 'allow'}]}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();
    // ---- startup done

    let events: TaskEvent[] = [];

    class T {
      @subscribe(TaskEvent) on(e: TaskEvent) {
        // console.log(e)
        const _e = _.cloneDeep(e);
        if (_e.topic === 'data') {
          events.push(_e);
        }
      }
    }

    const tasks: Tasks = Injector.get(Tasks.NAME);
    const ref = tasks.addTask(SimpleWorkerTask);


    const worker = <TaskQueueWorker>Container.get(TaskQueueWorker);
    await worker.prepare();
    await worker.queue.pause();

    const t = new T();
    await EventBus.register(t);

    // create event to fire
    const taskEvent = new TaskEvent();
    taskEvent.nodeId = NODEID;
    taskEvent.taskSpec = ref.name;
    let res = await EventBus.post(taskEvent);

    expect(res).to.have.length(1);
    res = res.shift();
    expect(res).to.have.length(2);

    const work = _.find(res, (x: any) => x && x.nodeId === NODEID) as TaskEvent;
    expect(work.nodeId).to.be.eq(NODEID);
    expect(work.respId).to.be.eq(NODEID);
    expect(work.state).to.be.eq('enqueue');

    worker.queue.resume();
    await TestHelper.waitFor(() => events.find(x => x.state === 'stopped' && x.id === work.id && x.topic === 'data'));
    await worker.queue.pause();
    // await worker.queue.await();
    expect(events).to.have.length(4);
    expect(events.map(e => {
      return {state: e.state, result: e.data ? e.data.results[0].result : null};
    })).to.deep.eq([
      {state: 'enqueue', result: null},
      {state: 'enqueue', result: null},
      {state: 'started', result: null},
      // {state: 'running', result: null},
      {state: 'stopped', result: 'test'}
    ]);

    events = [];

    const taskEvent2 = new TaskEvent();
    taskEvent2.nodeId = NODEID;
    taskEvent2.taskSpec = {name: ref.name, incomings: {data: 'pass test'}};
    const res2 = await EventBus.post(taskEvent2);
    const work2 = _.find(res2[0], (x: any) => x && x.nodeId === NODEID);
    expect(work2.nodeId).to.be.eq(NODEID);
    expect(work2.respId).to.be.eq(NODEID);
    expect(work2.state).to.be.eq('enqueue');

    worker.queue.resume();
    await TestHelper.waitFor(() => events.length >= 4);
    expect(events).to.have.length(4);
    expect(events.map(e => {
      return {state: e.state, result: e.data ? e.data.results[0].result : null};
    })).to.deep.eq([
      {state: 'enqueue', result: null},
      {state: 'enqueue', result: null},
      {state: 'started', result: null},
      {state: 'stopped', result: 'test'}
    ]);


    await EventBus.unregister(t);

    // ---- finished
    await bootstrap.shutdown();
  }


  @test
  async 'run local job with execution request'() {
    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'worker'},
        logging: {enable: LOG_EVENT, level: 'debug'},
        modules: {paths: [__dirname + '/../../..'], disableCache: true},
        storage: {default: TEST_STORAGE_OPTIONS},
        eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}},
        workers: {access: [{name: 'TaskQueueWorker', access: 'allow'}]}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();
    // ---- startup done


    const workers: Workers = Container.get(Workers.NAME);
    const workerInfos = workers.infos();

    expect(workerInfos).to.have.length(1);
    expect(workerInfos[0]).to.deep.include({
      name: 'task_queue_worker',
      className: 'TaskQueueWorker',
      statistics:
        {
          stats: {all: 0, done: 0, running: 0, enqueued: 0, active: 0},
          paused: false,
          idle: true,
          occupied: false,
          running: false
        }
    });


    const events: TaskEvent[] = [];

    class T02 {
      @subscribe(TaskEvent) on(e: TaskEvent) {
        if (e.topic !== 'data') {
          return;
        }
        const _e = _.cloneDeep(e);
        events.push(_e);
      }
    }

    const z = new T02();
    await EventBus.register(z);

    const tasks: Tasks = Injector.get(Tasks.NAME);
    const ref = tasks.addTask(SimpleWorkerTask, null, {worker: true});

    const execReq = Injector.get(TaskRequestFactory).executeRequest();
    const results = await execReq.create([ref.name]).run();
    await TestHelper.waitFor(() => events.length >= 4, 100);

    // ---- finished
    await EventBus.unregister(z);
    await bootstrap.shutdown();

    expect(results).to.have.length(1);
    expect(results[0]).to.deep.include({
      'state': 'enqueue',
      'topic': 'data',
      'nodeId': 'worker',
      'taskSpec': [
        'simple_worker_task'
      ],
      'targetIds': [
        'worker'
      ],
      'respId': 'worker',
      'errors': [],
    });
  }


  @test
  async 'run job on remote worker'() {
    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'system', path: __dirname + '/fake_app'},
        logging: {enable: LOG_EVENT, level: 'debug'},
        modules: {paths: [__dirname + '/../../..'], disableCache: true},
        storage: {default: TEST_STORAGE_OPTIONS},
        eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();
    // ---- startup done

    // capture events from remote task processing
    const events: TaskEvent[] = [];

    class T2 {
      @subscribe(TaskEvent)
      on(e: TaskEvent) {
        // console.log(e)
        if (e.topic !== 'data') {
          return;
        }
        const _e = _.cloneDeep(e);
        events.push(_e);
      }
    }

    const l = new T2();
    await EventBus.register(l);
    const p = SpawnHandle.do(__dirname + '/fake_app/node_task_worker.ts').start(LOG_EVENT);
    await p.started;
    await TestHelper.wait(100);

    const taskEvent = new TaskEvent();
    taskEvent.nodeId = bootstrap.getNodeId();
    taskEvent.taskSpec = 'test';
    taskEvent.parameters = {
      someValue: 'someValueEntry'
    };

    // the result are null cause of not
    // registered subscribers of remote nodes
    const results = await EventBus.post(taskEvent);
    await TestHelper.waitFor(() => !!events.find(x => x.state === 'stopped'));

    p.shutdown();
    await p.done;


    await EventBus.unregister(l);
    // ---- finished
    await bootstrap.shutdown();

    expect(events).to.have.length.gte(4);
    expect(events.map(x => {
      return {state: x.state, respId: x.respId};
    })).to.deep.eq([
      {state: 'proposed', respId: undefined},
      {state: 'enqueue', respId: 'fakeapp01'},
      {state: 'started', respId: 'fakeapp01'},
      {state: 'stopped', respId: 'fakeapp01'}
    ]);
    const x = events.map(x => {
      return {result: x.data ? x.data.results[0].result : null};
    });
    expect(x).to.deep.eq([
      {result: null},
      {result: null},
      {result: null},
      {result: {res: 'okay', value: 'someValueEntry'}}
    ]);
  }


  @test
  async 'run job on remote worker, but without necessary parameters'() {
    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'system', path: __dirname + '/fake_app'},
        logging: {enable: LOG_EVENT, level: 'debug'},
        modules: {paths: [__dirname + '/../../..'], disableCache: true},
        storage: {default: TEST_STORAGE_OPTIONS},
        eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();
    // ---- startup done

    // capture events from remote task processing
    const events: TaskEvent[] = [];

    class T2 {
      @subscribe(TaskEvent)
      on(e: TaskEvent) {
        if (e.topic !== 'data') {
          return;
        }
        const _e = _.cloneDeep(e);
        events.push(_e);
      }
    }

    const l = new T2();
    await EventBus.register(l);

    const p = SpawnHandle.do(__dirname + '/fake_app/node_task_worker.ts').start(LOG_EVENT);
    await p.started;
    await TestHelper.wait(50);

    const taskEvent = new TaskEvent();
    taskEvent.nodeId = bootstrap.getNodeId();
    taskEvent.taskSpec = 'test';
    taskEvent.parameters = {};

    // the result are null cause of not
    // registered subscribers of remote nodes
    const results = await EventBus.post(taskEvent);

    await TestHelper.waitFor(() => events.length > 1);
    p.shutdown();
    await p.done;
    await EventBus.unregister(l);
    // ---- finished
    await bootstrap.shutdown();

    expect(events).to.have.length(2);
    expect(events.map(x => {
      return {state: x.state};
    })).to.deep.eq([{state: 'proposed'}, {state: 'request_error'}]);
    const e = events.pop();
    expect(e.state).to.eq('request_error');
    expect(e.respId).to.eq('fakeapp01');
    expect(e.errors).to.have.length(1);
    expect(e.errors).to.deep.eq([{
      context: 'required_parameter',
      data: {required: 'someValue'},
      message: 'The required value is not passed.'
    }]);
  }


  @test
  async 'run job direct on remote worker'() {
    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'system', path: __dirname + '/fake_app'},
        logging: {enable: LOG_EVENT, level: 'debug'},
        modules: {paths: [__dirname + '/../../..'], disableCache: true},
        storage: {default: TEST_STORAGE_OPTIONS},
        eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();
    // ---- startup done
    // capture events from remote task processing
    const events: TaskEvent[] = [];

    class T2 {
      @subscribe(TaskEvent)
      on(e: TaskEvent) {
        if (e.topic !== 'data') {
          return;
        }
        const _e = _.cloneDeep(e);
        events.push(_e);
      }
    }

    const l = new T2();
    await EventBus.register(l);

    const handle = SpawnHandle.do(__dirname + '/fake_app/node_task_worker.ts').start(LOG_EVENT);
    await handle.started;
    await TestHelper.wait(50);

    const tasks: Tasks = Container.get(Tasks.NAME);
    const infos = tasks.infos(true);
    // Log.debug(infos);

    const taskEvent = new TaskEvent();
    taskEvent.nodeId = bootstrap.getNodeId();
    taskEvent.taskSpec = 'test';
    taskEvent.targetIds = ['fakeapp01'];
    taskEvent.parameters = {
      someValue: 'valueSome'
    };

    // the result are null cause of not
    // registered subscribers of remote nodes
    await EventBus.post(taskEvent);

    const taskEvent2 = new TaskEvent();
    taskEvent2.nodeId = bootstrap.getNodeId();
    taskEvent2.taskSpec = 'test';
    taskEvent2.targetIds = ['fakeapp02'];
    taskEvent2.parameters = {
      someValue: 'valueSome'
    };

    // the result are null cause of not
    // registered subscribers of remote nodes
    await EventBus.post(taskEvent2);
    await TestHelper.waitFor(() => !!events.find(x => x.state === 'stopped'));
    // await TestHelper.waitFor(() => events.length > 6);
    handle.shutdown();

    await handle.done;

    await EventBus.unregister(l);

    // ---- finished
    await bootstrap.shutdown();

    const events_01: TaskEvent[] = events.filter(x => x.targetIds.indexOf('system') !== -1);
    const events_02: TaskEvent[] = events.filter(x => x.targetIds.indexOf('fakeapp01') !== -1);
    const events_03: TaskEvent[] = events.filter(x => x.targetIds.indexOf('fakeapp02') !== -1);
    expect(events_01).to.have.length(3);
    expect(events_02).to.have.length(1);
    expect(events_03).to.have.length(1);

    expect(events_01.map(x => {
      return {state: x.state, respId: x.respId};
    })).to.deep.eq([
      {state: 'enqueue', respId: 'fakeapp01'},
      {state: 'started', respId: 'fakeapp01'},
      {state: 'stopped', respId: 'fakeapp01'}
    ]);

    expect(events_02.map(x => {
      return {state: x.state, respId: x.respId};
    })).to.deep.eq([
      {state: 'proposed', respId: undefined},
    ]);

    expect(events_01.map(x => {
      return {result: x.data ? x.data.results[0].result : null};
    })).to.deep.eq([
      {result: null},
      {result: null},
      {result: {res: 'okay', value: 'valueSome'}}
    ]);
  }


  @test
  async 'run job remote over task command'() {
    // typexs task test [--targetId abc] [--outputMode worker|local /* default is worker if on exists else startup local*/]

    const handle = SpawnHandle.do(__dirname + '/fake_app/node_task_worker.ts').start(LOG_EVENT);
    await handle.started;

    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'event', path: __dirname + '/fake_app'},
        logging: {enable: LOG_EVENT, level: 'debug', loggers: [{name: '*', level: 'debug'}]},
        modules: {paths: [__dirname + '/../../..'], disableCache: true},
        storage: {default: TEST_STORAGE_OPTIONS},
        // cache: {bins: {default: 'redis1'}, adapter: {redis1: {type: 'redis', host: '127.0.0.1', port: 6379}}},
        eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();
    await TestHelper.wait(50);

    const command = Container.get(TaskCommand);
    // expect(commands.length).to.be.gt(0);

    // let command: TaskCommand = _.find(commands, e => e.command == 'task');
    Config.set('argv.remote', true, 'system');
    Config.set('argv.someValue', 'value', 'system');
    process.argv = ['typexs', 'task', 'test'];

    const events: TaskEvent[] = [];


    class T2 {
      @subscribe(TaskEvent)
      on(e: TaskEvent) {
        const _e = _.cloneDeep(e);
        events.push(_e);
      }
    }

    const l = new T2();
    await EventBus.register(l);

    await command.handler({});

    await TestHelper.waitFor(() => !!events.find(x => x.state === 'stopped'));
    handle.shutdown();

    await EventBus.unregister(l);

    handle.shutdown();
    await handle.done;
    await bootstrap.shutdown();
    expect(events).to.have.length.gte(4);
    expect(events.map(x => x.state)).to.contain.members(['proposed', 'enqueue', 'started', 'stopped']);
  }


  @test
  async 'monitor local task execution'() {
    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'worker'},
        logging: {enable: LOG_EVENT, level: 'debug'},
        modules: {paths: [__dirname + '/../../..'], disableCache: true},
        storage: {default: TEST_STORAGE_OPTIONS},
        eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}},
        workers: {access: [{name: 'Task*Worker', access: 'allow'}]}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();
    // ---- startup done

    const events: TaskEvent[] = [];

    class T2 {
      @subscribe(TaskEvent)
      on(e: TaskEvent) {
        const _e = _.cloneDeep(e);
        events.push(_e);
      }
    }

    const l = new T2();
    await EventBus.register(l);

    const tasks: Tasks = Container.get(Tasks.NAME);
    const ref = tasks.addTask(SimpleTaskWithLog, null, {worker: true});

    const execReq = Container.get(TaskRequestFactory).executeRequest();
    const results = await execReq.create([ref.name]).run();
    await TestHelper.waitFor(() => !!events.find(x => x.state === 'stopped'));

    await (Container.get(TaskMonitorWorker) as TaskMonitorWorker).queue.await();
    const storeRef: StorageRef = Container.get(C_STORAGE_DEFAULT);
    const logs: any[] = await storeRef.getController().find(TaskLog);


    await EventBus.unregister(l);
    // ---- finished
    await bootstrap.shutdown();

    expect(logs).to.have.length(1);

    expect(results).to.have.length(1);
    expect(results[0]).to.deep.include({
      'state': 'enqueue',
      'topic': 'data',
      'nodeId': 'worker',
      'taskSpec': [
        'simple_task_with_log'
      ],
      'targetIds': [
        'worker'
      ],
      'respId': 'worker',
      'errors': [],
    });
  }


  @test.skip
  async 'execute remote and get results'() {

  }
}
