import {suite, test} from 'mocha-typescript';
import {spawn} from "child_process";
import {expect} from 'chai';
import {Bootstrap} from "../../../src/Bootstrap";
import {ITypexsOptions} from "../../../src";
import {Config} from "commons-config";
import {TEST_STORAGE_OPTIONS} from "../config";
import {IEventBusConfiguration} from "commons-eventbus";
import {Container} from "typedi";
import {System} from "../../../src/libs/system/System";
import {inspect} from "util";
import {C_TASKS} from "../../../src/libs/tasks/Constants";


@suite('functional/tasks/tasks_system')
class Tasks_systemSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }


  @test
  async 'pass task informations'() {
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

    let system: System = Container.get(System.NAME);
    await bootstrap.shutdown();

    expect(system.node.nodeId).to.eq('system');
    expect(system.node.contexts).to.have.length.gt(0);
    expect(system.node.contexts[0].context).to.eq(C_TASKS);
    expect(system.node.contexts[0].tasks[0]).to.deep.eq(
      {
        name: 'test',
        description: 'Hallo welt',
        permissions: null,
        groups: [],
        nodeIds: ['system'],
        remote: null
      });

  }


  @test
  async 'pass task exchange'() {

    let p = spawn(process.execPath,['--require','ts-node/register',__dirname + '/fake_app/node.ts']);
    p.stdout.on("data", d => { console.log(d.toString().trim());});
    p.stderr.on("data", d => { console.error(d.toString().trim()); });
    p.on('exit',() => { console.log('done'); });

    await new Promise(resolve => {
      setTimeout(resolve,3000);
    })

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

    let system: System = Container.get(System.NAME);


    await bootstrap.shutdown();


    await new Promise(resolve => {
      setTimeout(resolve,4000);
    })

    console.log(inspect(system.node, false, 10));
    console.log(system.nodes);
  }


}

