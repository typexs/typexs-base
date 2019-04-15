import * as _ from 'lodash';
import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';

import {Bootstrap} from "../../../src/Bootstrap";
import {Log} from "../../../src/libs/logging/Log";
import {C_STORAGE_DEFAULT, ITypexsOptions, StorageRef, TaskLog, Tasks, Workers} from "../../../src";
import {Container} from "typedi";
import {Config} from "commons-config";
import {TEST_STORAGE_OPTIONS} from "../config";
import {EventBus, IEventBusConfiguration} from "commons-eventbus";
import {TaskQueueWorker} from "../../../src/workers/TaskQueueWorker";
import {SimpleWorkerTask} from "./tasks/SimpleWorkerTask";
import {TaskEvent} from "../../../src/libs/tasks/worker/TaskEvent";
import subscribe from "commons-eventbus/decorator/subscribe";
import {TestHelper} from "../TestHelper";
import {SpawnHandle} from "../SpawnHandle";
import {TaskCommand} from "../../../src/commands/TaskCommand";
import {SimpleTaskWithLog} from "./tasks/SimpleTaskWithLog";
import {TaskExecutionRequestFactory} from "../../../src/libs/tasks/worker/TaskExecutionRequestFactory";
import {inspect} from "util";


const LOG_EVENT = true;//TestHelper.logEnable(true);
let bootstrap: Bootstrap = null;

@suite('functional/tasks/tasks_worker')
class Tasks_workerSpec {


  before() {

    Bootstrap.reset();
    Config.clear();
  }


  async after() {
    if (bootstrap) {
      await bootstrap.shutdown()
    }
  }

  @test
  async 'run local job'() {
    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'worker'},
        logging: {enable: LOG_EVENT, level: 'debug'},
        modules: {paths: [__dirname + '/../../..']},
        storage: {default: TEST_STORAGE_OPTIONS},
        eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}}
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
        let _e = _.cloneDeep(e);
        events.push(_e);
      }
    }

    let tasks: Tasks = Container.get(Tasks.NAME);
    let ref = tasks.addTask(SimpleWorkerTask);


    const worker = <TaskQueueWorker>Container.get(TaskQueueWorker);
    await worker.prepare();
    await worker.queue.pause();

    let t = new T();
    await EventBus.register(t);

    // create event to fire
    let taskEvent = new TaskEvent();
    taskEvent.nodeId = Bootstrap.getNodeId();
    taskEvent.name = ref.name;

    let res = await EventBus.post(taskEvent);

    expect(res).to.have.length(1);
    res = res.shift();
    expect(res).to.have.length(3);
    let work = _.find(res, (x: any) => x && x.nodeId == 'worker');
    expect(work.nodeId).to.be.eq('worker');
    expect(work.respId).to.be.eq('worker');
    expect(work.state).to.be.eq('enqueue');

    worker.queue.resume();
    await TestHelper.waitFor(() => events.length >= 4);
    //await worker.queue.await();

    await EventBus.unregister(t);

    // ---- finished
    await bootstrap.shutdown();

    //  console.log(inspect(events,false,10))
    expect(events).to.have.length(4);
    expect(events.map(e => {
      return {state: e.state, result: e.data ? e.data.results[0].result : null}
    })).to.deep.eq([
      {state: 'enqueue', result: null},
      {state: 'enqueue', result: null},
      {state: 'started', result: null},
      {state: 'stopped', result: 'test'}
    ]);

    Log.debug(events)
  }


  @test
  async 'run local job with execution request'() {
    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'worker'},
        logging: {enable: LOG_EVENT, level: 'debug'},
        modules: {paths: [__dirname + '/../../..']},
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
    let workerInfos = workers.infos();

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


    let events: TaskEvent[] = [];

    class T02 {
      @subscribe(TaskEvent) on(e: TaskEvent) {
        let _e = _.cloneDeep(e);
        events.push(_e);
      }
    }

    let z = new T02();
    await EventBus.register(z);


    let tasks: Tasks = Container.get(Tasks.NAME);
    let ref = tasks.addTask(SimpleWorkerTask);

    // const workers: Workers = Container.get(Workers.NAME);
    // const worker: TaskQueueWorker = <TaskQueueWorker>workers.workers.find(x => x instanceof TaskQueueWorker);

    let execReq = Container.get(TaskExecutionRequestFactory).createRequest();
    let results = await execReq.run([ref.name]);
    Log.debug('got results')
    await TestHelper.waitFor(() => events.length >= 4, 100);
    //await worker.queue.await();

    // ---- finished
    await EventBus.unregister(z);
    await bootstrap.shutdown();

    expect(results).to.have.length(1);
    expect(results[0]).to.deep.include({
      "state": "enqueue",
      "topic": "data",
      "nodeId": "worker",
      "name": [
        "simple_worker_task"
      ],
      "targetIds": [
        "worker"
      ],
      "respId": "worker",
      "errors": [],
    });
  }

  @test
  async 'run job on remote worker'() {
    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'system', path: __dirname + '/fake_app'},
        logging: {enable: true, level: 'debug'},
        modules: {paths: [__dirname + '/../../..']},
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
    let events: TaskEvent[] = [];

    class T2 {
      @subscribe(TaskEvent)
      on(e: TaskEvent) {
        let _e = _.cloneDeep(e);
        events.push(_e);
      }
    }

    let l = new T2()
    await EventBus.register(l);

    let p = SpawnHandle.do(__dirname + '/fake_app/node_task_worker.ts').start(LOG_EVENT);

    await p.started;
    await TestHelper.wait(50);

    let taskEvent = new TaskEvent();
    taskEvent.nodeId = bootstrap.getNodeId();
    taskEvent.name = 'test';
    taskEvent.parameters = {
      someValue: 'someValueEntry'
    };

    // the result are null cause of not
    // registered subscribers of remote nodes
    let results = await EventBus.post(taskEvent);

    await TestHelper.waitFor(() => events.length > 5);
    p.shutdown();
    await p.done;

    await EventBus.unregister(l);
    // ---- finished
    await bootstrap.shutdown();

    expect(events).to.have.length(6);
    expect(events.map(x => {
      return {state: x.state, respId: x.respId}
    })).to.deep.eq([
      {state: 'proposed', respId: undefined},
      {state: "enqueue", respId: "fakeapp01"},
      {state: 'started', respId: 'fakeapp01'},
      {state: 'stopped', respId: 'fakeapp01'},
      {state: 'stopped', respId: 'fakeapp01'},
      {state: 'stopped', respId: 'fakeapp01'}
    ]);

    expect(events.map(x => {
      return {result: x.data ? x.data.results[0].result : null}
    })).to.deep.eq([
      {result: null},
      {result: null},
      {result: null},
      {result: {res: 'okay', value: 'someValueEntry'}},
      {result: {res: 'okay', value: 'someValueEntry'}},
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
        modules: {paths: [__dirname + '/../../..']},
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
    let events: TaskEvent[] = [];

    class T2 {
      @subscribe(TaskEvent)
      on(e: TaskEvent) {
        let _e = _.cloneDeep(e);
        events.push(_e);
      }
    }

    let l = new T2();
    await EventBus.register(l);

    let p = SpawnHandle.do(__dirname + '/fake_app/node_task_worker.ts').start(LOG_EVENT);
    await p.started;
    await TestHelper.wait(50);

    let taskEvent = new TaskEvent();
    taskEvent.nodeId = bootstrap.getNodeId();
    taskEvent.name = 'test';
    taskEvent.parameters = {};

    // the result are null cause of not
    // registered subscribers of remote nodes
    let results = await EventBus.post(taskEvent);

    await TestHelper.waitFor(() => events.length > 1);
    p.shutdown();
    await p.done;
    await EventBus.unregister(l);
    // ---- finished
    await bootstrap.shutdown();

    expect(events).to.have.length(2);
    expect(events.map(x => {
      return {state: x.state}
    })).to.deep.eq([{state: 'proposed'}, {state: 'request_error'}]);
    let e = events.pop();
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
        modules: {paths: [__dirname + '/../../..']},
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
    let events: TaskEvent[] = [];

    class T2 {
      @subscribe(TaskEvent)
      on(e: TaskEvent) {
        let _e = _.cloneDeep(e);
        events.push(_e);
        /*
        if (events.length > 6) {
          handle.shutdown();
        }
        */
      }
    }

    let l = new T2();
    await EventBus.register(l);

    let handle = SpawnHandle.do(__dirname + '/fake_app/node_task_worker.ts').start(LOG_EVENT);
    await handle.started;
    await TestHelper.wait(50);

    let tasks: Tasks = Container.get(Tasks.NAME);
    let infos = tasks.infos(true);
    Log.debug(infos);

    let taskEvent = new TaskEvent();
    taskEvent.nodeId = bootstrap.getNodeId();
    taskEvent.name = 'test';
    taskEvent.targetIds = ['fakeapp01'];
    taskEvent.parameters = {
      someValue: 'valueSome'
    };

    // the result are null cause of not
    // registered subscribers of remote nodes
    await EventBus.post(taskEvent);

    let taskEvent2 = new TaskEvent();
    taskEvent2.nodeId = bootstrap.getNodeId();
    taskEvent2.name = 'test';
    taskEvent2.targetIds = ['fakeapp02'];
    taskEvent2.parameters = {
      someValue: 'valueSome'
    };

    // the result are null cause of not
    // registered subscribers of remote nodes
    await EventBus.post(taskEvent2);

    await TestHelper.waitFor(() => events.length > 6);
    handle.shutdown();

    await handle.done;

    await EventBus.unregister(l);

    // ---- finished
    await bootstrap.shutdown();

    let events_01: TaskEvent[] = events.filter(x => x.targetIds.indexOf('fakeapp01') != -1);
    let events_02: TaskEvent[] = events.filter(x => x.targetIds.indexOf('fakeapp02') != -1);
    expect(events_01).to.have.length(6);
    expect(events_02).to.have.length(1);

    expect(events_01.map(x => {
      return {state: x.state, respId: x.respId}
    })).to.deep.eq([
      {state: 'proposed', respId: undefined},
      {state: "enqueue", respId: "fakeapp01"},
      {state: 'started', respId: 'fakeapp01'},
      {state: 'stopped', respId: 'fakeapp01'},
      {state: 'stopped', respId: 'fakeapp01'},
      {state: 'stopped', respId: 'fakeapp01'}
    ]);

    expect(events_02.map(x => {
      return {state: x.state, respId: x.respId}
    })).to.deep.eq([
      {state: 'proposed', respId: undefined},
    ]);

    expect(events_01.map(x => {
      return {result: x.data ? x.data.results[0].result : null}
    })).to.deep.eq([
      {result: null},
      {result: null},
      {result: null},
      {result: {res: 'okay', value: 'valueSome'}},
      {result: {res: 'okay', value: 'valueSome'}},
      {result: {res: 'okay', value: 'valueSome'}}
    ]);
  }


  @test
  async 'run job remote over task command'() {
    // typexs task test [--targetId abc] [--mode worker|local /* default is worker if on exists else startup local*/]

    let handle = SpawnHandle.do(__dirname + '/fake_app/node_task_worker.ts').start(LOG_EVENT);
    await handle.started;

    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'event', path: __dirname + '/fake_app'},
        logging: {enable: LOG_EVENT, level: 'debug', loggers: [{name: '*', level: 'debug'}]},
        modules: {paths: [__dirname + '/../../..']},
        storage: {default: TEST_STORAGE_OPTIONS},
        //cache: {bins: {default: 'redis1'}, adapter: {redis1: {type: 'redis', host: '127.0.0.1', port: 6379}}},
        eventbus: {default: <IEventBusConfiguration>{adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}}}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();
    await TestHelper.wait(50);

    let commands = bootstrap.getCommands();
    expect(commands.length).to.be.gt(0);

    let command: TaskCommand = _.find(commands, e => e.command == 'task');
    Config.set('argv.remote', true, 'system');
    Config.set('argv.someValue', 'value', 'system');
    process.argv = ['typexs', 'task', 'test'];

    let events: TaskEvent[] = [];


    class T2 {
      @subscribe(TaskEvent)
      on(e: TaskEvent) {
        let _e = _.cloneDeep(e);
        events.push(_e);
      }
    }

    let l = new T2();
    await EventBus.register(l);

    await command.handler({});

    await TestHelper.waitFor(() => events.length > 6);
    handle.shutdown();

    await EventBus.unregister(l);

    handle.shutdown();
    await handle.done;
    await bootstrap.shutdown();
    //console.log(inspect(events,false,10))
    expect(events).to.have.length.gt(6);
    expect(events.map(x => x.state)).to.contain.members(["proposed", "enqueue", "started", "stopped"]);
    expect(events.map(x => x.topic)).to.contain.members(["data", "log"]);
  }


  @test
  async 'monitor local task execution'() {
    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'worker'},
        logging: {enable: LOG_EVENT, level: 'debug'},
        modules: {paths: [__dirname + '/../../..']},
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

    let events: TaskEvent[] = [];

    class T2 {
      @subscribe(TaskEvent)
      on(e: TaskEvent) {
        let _e = _.cloneDeep(e);
        events.push(_e);
      }
    }

    let l = new T2();
    await EventBus.register(l);


    let tasks: Tasks = Container.get(Tasks.NAME);
    let ref = tasks.addTask(SimpleTaskWithLog);

    //const workers: Workers = Container.get(Workers.NAME);
    //const worker: TaskQueueWorker = <TaskQueueWorker>workers.workers.find(x => x instanceof TaskQueueWorker);
    //const monitor: TaskMonitorWorker = <TaskMonitorWorker>workers.workers.find(x => x instanceof TaskMonitorWorker);

    let execReq = Container.get(TaskExecutionRequestFactory).createRequest();
    let results = await execReq.run([ref.name]);
    await TestHelper.waitFor(() => events.length >= 9);

    let storeRef: StorageRef = Container.get(C_STORAGE_DEFAULT);
    let logs: any[] = await storeRef.getController().find(TaskLog);

    await EventBus.unregister(l);
    // ---- finished
    await bootstrap.shutdown();
    expect(logs).to.have.length(1);

    expect(results).to.have.length(1);
    expect(results[0]).to.deep.include({
      "state": "enqueue",
      "topic": "data",
      "nodeId": "worker",
      "name": [
        "simple_task_with_log"
      ],
      "targetIds": [
        "worker"
      ],
      "respId": "worker",
      "errors": [],
    });
  }
}
