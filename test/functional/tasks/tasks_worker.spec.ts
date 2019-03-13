import * as _ from 'lodash';
import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';

import {Bootstrap} from "../../../src/Bootstrap";
import {Log} from "../../../src/libs/logging/Log";
import {ITypexsOptions, Tasks} from "../../../src";
import {Container} from "typedi";
import {Config} from "commons-config";
import {TEST_STORAGE_OPTIONS} from "../config";
import {EventBus, IEventBusConfiguration} from "commons-eventbus";
import {TaskWorkerQueue} from "../../../src/libs/worker/TaskWorkerQueue";
import {SimpleWorkerTask} from "./tasks/SimpleWorkerTask";
import {TaskEvent} from "../../../src/libs/worker/TaskEvent";
import subscribe from "commons-eventbus/decorator/subscribe";
import {TestHelper} from "../TestHelper";
import {spawn} from "child_process";
import {inspect} from "util";
import {SpawnHandle} from "../SpawnHandle";


@suite('functional/tasks/tasks_worker')
class Tasks_workerSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }


  @test
  async 'run local job'() {
    let bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'worker'},
        logging: {enable: true, level: 'debug'},
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
    // ---- startup done

    let events: TaskEvent[] = [];

    class T {

      @subscribe(TaskEvent)
      on(e: TaskEvent) {
        let _e = _.cloneDeep(e);
        events.push(_e);
        //console.log(inspect(_e, false, 10));
      }
    }

    let tasks: Tasks = Container.get(Tasks.NAME);
    let ref = tasks.addTask(SimpleWorkerTask);

    const worker = <TaskWorkerQueue>Container.get(TaskWorkerQueue);
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
    expect(res).to.have.length(2);
    let work = res.shift();
    expect(work.nodeId).to.be.eq('worker');
    expect(work.respId).to.be.eq('worker');
    expect(work.state).to.be.eq('enqueue');

    worker.queue.resume();
    await TestHelper.wait(50);
    await worker.queue.await();


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
    ])
  }

  @test
  async 'run job on remote worker'() {
    let bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'system', path: __dirname + '/fake_app'},
        logging: {enable: true, level: 'debug'},
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

    await EventBus.register(new T2());

    let p = spawn(process.execPath, ['--require', 'ts-node/register', __dirname + '/fake_app/node_task_worker.ts']);
    p.stdout.on("data", d => {
      console.log(d.toString().trim());
    });
    p.stderr.on("data", d => {
      console.error(d.toString().trim());
    });

    let nodeDone = new Promise(resolve => {
      p.on('exit', resolve);
    });

    let nodeStartuped = new Promise(resolve => {
      p.stderr.on("data", d => {
        let x = d.toString().trim();
        if (/startup finished/.test(x)) {
          resolve();
        }
      });
    });
    await nodeStartuped;
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

    await nodeDone;

    // ---- finished
    await bootstrap.shutdown();

    expect(events).to.have.length(4);
    expect(events.map(x => {
      return {state: x.state, respId: x.respId}
    })).to.deep.eq([
      {state: 'proposed', respId: undefined},
      {state: "enqueue", respId: "fakeapp01"},
      {state: 'started', respId: 'fakeapp01'},
      {state: 'stopped', respId: 'fakeapp01'}
    ]);

    expect(events.map(x => {
      return {result: x.data ? x.data.results[0].result : null}
    })).to.deep.eq([
      {result: null},
      {result: null},
      {result: null},
      {result: {res: 'okay', value: 'someValueEntry'}}
    ]);
  }

  @test
  async 'run job on remote worker, but without necessary parameters'() {
    let bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'system', path: __dirname + '/fake_app'},
        logging: {enable: true, level: 'debug'},
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

    await EventBus.register(new T2());

    let p = spawn(process.execPath, ['--require', 'ts-node/register', __dirname + '/fake_app/node_task_worker.ts']);
    p.stdout.on("data", d => {
      console.log(d.toString().trim());
    });
    p.stderr.on("data", d => {
      console.error(d.toString().trim());
    });

    let nodeDone = new Promise(resolve => {
      p.on('exit', resolve);
    });

    let nodeStartuped = new Promise(resolve => {
      p.stderr.on("data", d => {
        let x = d.toString().trim();
        if (/startup finished/.test(x)) {
          resolve();
        }
      });
    });
    await nodeStartuped;
    await TestHelper.wait(50);

    let taskEvent = new TaskEvent();
    taskEvent.nodeId = bootstrap.getNodeId();
    taskEvent.name = 'test';
    taskEvent.parameters = {};

    // the result are null cause of not
    // registered subscribers of remote nodes
    let results = await EventBus.post(taskEvent);

    await nodeDone;

    // ---- finished
    await bootstrap.shutdown();

    expect(events).to.have.length(2);
    expect(events.map(x => {
      return {state: x.state}
    })).to.deep.eq([{state: 'proposed'}, {state: 'errored'}]);
    let e = events.pop();
    expect(e.state).to.eq('errored');
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
    let bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'system', path: __dirname + '/fake_app'},
        logging: {enable: true, level: 'debug'},
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

    await EventBus.register(new T2());

    let handle = SpawnHandle.do(__dirname + '/fake_app/node_task_worker.ts').start(true);

    await handle.started;
    await TestHelper.wait(50);

    let tasks: Tasks = Container.get(Tasks.NAME);
    let infos = tasks.infos(true);
    Log.debug(infos);

    let taskEvent = new TaskEvent();
    taskEvent.nodeId = bootstrap.getNodeId();
    taskEvent.name = 'test';
    taskEvent.targetId = 'fakeapp01';
    taskEvent.parameters = {
      someValue: 'valueSome'
    };

    // the result are null cause of not
    // registered subscribers of remote nodes
    await EventBus.post(taskEvent);


    let taskEvent2 = new TaskEvent();
    taskEvent2.nodeId = bootstrap.getNodeId();
    taskEvent2.name = 'test';
    taskEvent2.targetId = 'fakeapp02';
    taskEvent2.parameters = {
      someValue: 'valueSome'
    };

    // the result are null cause of not
    // registered subscribers of remote nodes
    await EventBus.post(taskEvent2);


    await handle.done;

    // ---- finished
    await bootstrap.shutdown();

    let events_01: TaskEvent[] = events.filter(x => x.targetId == 'fakeapp01');
    let events_02: TaskEvent[] = events.filter(x => x.targetId == 'fakeapp02');
    expect(events_01).to.have.length(4);
    expect(events_02).to.have.length(1);

    expect(events_01.map(x => {
      return {state: x.state, respId: x.respId}
    })).to.deep.eq([
      {state: 'proposed', respId: undefined},
      {state: "enqueue", respId: "fakeapp01"},
      {state: 'started', respId: 'fakeapp01'},
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
      {result: {res: 'okay', value: 'valueSome'}}
    ]);
  }


  @test
  async 'run job over task command'() {
    // typexs task test [--targetId abc] [--mode worker|local /* default is worker if on exists else startup local*/]

    let handle = SpawnHandle.do(__dirname + '/fake_app/node_task_worker.ts').start(true);
    await handle.started;


    let bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'system', path: __dirname + '/fake_app'},
        logging: {enable: true, level: 'debug'},
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


    let commands = bootstrap.getCommands();
    expect(commands.length).to.be.gt(0);

    let command = _.find(commands, e => e.command == 'task');
    Config.set('argv.mode','worker');
    let c = Config.all();
    console.log(inspect(c, false, 10));
    //command.handler({});
    c = Config.get('argv.mode');

    await bootstrap.shutdown();

  }

}
