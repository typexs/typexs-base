import * as _ from 'lodash';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {Bootstrap} from '../../../src/Bootstrap';
import {TEST_STORAGE_OPTIONS} from '../config';
import {IEventBusConfiguration} from 'commons-eventbus';
import {System} from '../../../src/libs/system/System';
import {C_TASKS} from '../../../src/libs/tasks/Constants';
import {TestHelper} from '../TestHelper';
import {SpawnHandle} from '../SpawnHandle';
import {ITypexsOptions} from '../../../src/libs/ITypexsOptions';
import {Tasks} from '../../../src/libs/tasks/Tasks';
import {Injector} from '../../../src/libs/di/Injector';

const LOG_EVENT = TestHelper.logEnable(false);


@suite('functional/tasks/tasks_system')
class TasksSystemSpec {


  async before() {
    await TestHelper.clearCache();
    Bootstrap.reset();
  }


  @test
  async 'pass task information to system object'() {
    const nodeId = 'system_0';
    let bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {
          name: 'test',
          nodeId: nodeId,
          path: __dirname + '/fake_app'
        },
        logging: {
          enable: LOG_EVENT, level: 'debug'
        },
        modules: {
          paths: [__dirname + '/../../..'], disableCache: true
        },
        storage: {
          default: TEST_STORAGE_OPTIONS
        },
        eventbus: {
          default: <IEventBusConfiguration>{
            adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}
          }
        }
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();

    const system: System = Injector.get(System.NAME);
    const n = _.cloneDeep(system.node);

    await bootstrap.shutdown();

    expect(n.nodeId).to.eq(nodeId);
    expect(n.contexts).to.have.length.gt(0);
    expect(n.contexts[1].context).to.eq(C_TASKS);
    expect(_.find(n.contexts[1].tasks, x => x.name === 'test')).to.deep.eq({
      name: 'test',
      description: 'Hallo welt',
      permissions: null,
      groups: [],
      nodeInfos: [
        {
          'hasWorker': false,
          'nodeId': 'system_0'
        }
      ],
      remote: null
    });
  }


  @test
  async 'update task information by additional remote execution'() {
    const nodeId = 'system_1';
    let bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: nodeId, path: __dirname + '/fake_app'},
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

    const system: System = Injector.get(System.NAME);
    const tasks: Tasks = Injector.get(Tasks.NAME);

    let taskInfos = tasks.infos(true);

    expect(system.nodes).to.have.length(0);
    expect(taskInfos).to.have.length(1);
    expect(taskInfos[0]).to.deep.eq({
      name: 'test',
      description: 'Hallo welt',
      permissions: null,
      groups: [],
      'nodeInfos': [
        {
          'hasWorker': false,
          'nodeId': nodeId
        }
      ],
      remote: null
    });

    const p = SpawnHandle.do(__dirname + '/fake_app/node.ts').start(LOG_EVENT);
    await p.started;
    await TestHelper.wait(100);

    taskInfos = tasks.infos(true);
    expect(system.nodes).to.have.length(1);
    expect(taskInfos).to.have.length(1);
    expect(taskInfos[0]).to.deep.eq({
      name: 'test',
      description: 'Hallo welt',
      permissions: null,
      groups: [],
      'nodeInfos': [
        {
          'hasWorker': false,
          'nodeId': nodeId,
        },
        {
          'hasWorker': false,
          'nodeId': 'fakeapp01'
        }
      ],
      remote: null
    });

    p.shutdown();
    await p.done;
    await TestHelper.wait(500);
    taskInfos = tasks.infos(true);
    await bootstrap.shutdown();

    expect(system.nodes).to.have.length(0);
    expect(taskInfos).to.have.length(1);
    expect(taskInfos[0]).to.deep.eq({
      name: 'test',
      description: 'Hallo welt',
      permissions: null,
      groups: [],
      'nodeInfos': [
        {
          'hasWorker': false,
          'nodeId': nodeId
        }
      ],
      remote: null
    });

  }


  @test
  async 'get task information from remote node'() {
    const nodeId = 'system_2';
    let bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {
          name: 'test', nodeId: nodeId, path: __dirname + '/fake_app_main'
        },
        logging: {
          enable: LOG_EVENT, level: 'debug'
        },
        modules: {
          paths: [__dirname + '/../../..'],
          disableCache: true
        },
        storage: {
          default: TEST_STORAGE_OPTIONS
        },
        eventbus: {
          default: <IEventBusConfiguration>{
            adapter: 'redis', extra: {host: '127.0.0.1', port: 6379}
          }
        }
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();

    const system: System = Injector.get(System.NAME);
    const tasks: Tasks = Injector.get(Tasks.NAME);
    let taskInfos = tasks.infos(true);

    expect(system.nodes).to.have.length(0);
    expect(taskInfos).to.have.length(0);


    const p = SpawnHandle.do(__dirname + '/fake_app/node.ts').start(LOG_EVENT);
    await p.started;
    await TestHelper.wait(50);


    taskInfos = tasks.infos(true);
    expect(system.nodes).to.have.length(1);
    expect(taskInfos).to.have.length(1);
    expect(taskInfos[0]).to.deep.eq({
      name: 'test',
      description: 'Hallo welt',
      permissions: null,
      groups: [],
      'nodeInfos': [
        {
          'hasWorker': false,
          'nodeId': 'fakeapp01'
        }
      ],
      remote: true
    });

    p.shutdown();
    await p.done;
    await bootstrap.shutdown();

    taskInfos = tasks.infos(true);
    expect(system.nodes).to.have.length(0);
    expect(taskInfos).to.have.length(0);

  }


}

