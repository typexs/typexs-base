import {suite, test} from 'mocha-typescript';
import {spawn} from "child_process";
import {expect} from 'chai';
import {Bootstrap} from "../../../src/Bootstrap";
import {Invoker, ITypexsOptions} from "../../../src";
import {Config} from "commons-config";
import {TEST_STORAGE_OPTIONS} from "../config";
import {IEventBusConfiguration} from "commons-eventbus";
import {Container} from "typedi";
import {System} from "../../../src/libs/system/System";
import {SystemApi} from "../../../src/api/System.api";
import {ISystemApi} from "../../../src/api/ISystemApi";
import {INodeInfo} from "../../../src/libs/system/INodeInfo";
import {NodeInfo} from "../../../src/libs/system/events/NodeInfo";
import {TestHelper} from "../TestHelper";
import {SpawnHandle} from "../SpawnHandle";


@suite('functional/system/system_redis_connected')
class Tasks_systemSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }


  @test
  async 'check own node info'() {
    let bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure(<ITypexsOptions & any>{
        app: {name: 'test', nodeId: 'system', path: __dirname + '/fake_app'},
        logging: {enable: false, level: 'debug'},
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
    expect(system.node.state).to.eq('idle');

    await bootstrap.shutdown();
    expect(system.node.nodeId).to.eq('system');
    expect(system.node.state).to.eq('unregister');
  }


  @test
  async 'node register and unregister'() {
    let bootstrap = Bootstrap
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

    let remoteNode: NodeInfo = null;

    class OnSystem implements ISystemApi {
      getNodeInfos(): INodeInfo | INodeInfo[] {
        return [];
      }

      onNodeRegister(x: NodeInfo): void {
        remoteNode = x;
      }

      onNodeUnregister(x: NodeInfo): void {
        remoteNode = x;
      }
    }

    let invoker: Invoker = Container.get(Invoker.NAME);
    invoker.register(SystemApi, OnSystem);

    let system: System = Container.get(System.NAME);


    let p = SpawnHandle.do( __dirname + '/fake_app/node.ts').start(true);
    await p.started;
    await TestHelper.wait(100);

    expect(remoteNode.nodeId).to.be.eq('fakeapp01');
    expect(remoteNode.state).to.be.eq('register');
    expect(system.nodes).to.have.length(1);
    expect(system.nodes[0].nodeId).to.be.eq('fakeapp01');
    await p.done;

    expect(remoteNode.nodeId).to.be.eq('fakeapp01');
    expect(remoteNode.state).to.be.eq('unregister');
    expect(system.nodes).to.have.length(0);
    expect(system.nodes).to.have.length(0);

    await bootstrap.shutdown();
    expect(system.nodes).to.have.length(0)

  }


}

