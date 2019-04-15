//process.env.SQL_LOG = "1";
import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import * as path from "path";
import {Bootstrap} from "../../../src/Bootstrap";
import {Config} from "commons-config";
import * as _ from "lodash";
import {TaskCommand} from "../../../src/commands/TaskCommand";
import {TEST_STORAGE_OPTIONS} from "../config";
import {Container} from "typedi";
import {C_STORAGE_DEFAULT, StorageRef, TaskLog} from "../../../src";


const stdMocks = require('std-mocks');

let bootstrap: Bootstrap;

@suite('functional/commands/tasks')
class TasksSpec {


  static async before() {
    Bootstrap.reset();
    Config.clear();


    let appdir = path.join(__dirname, 'fake_app');
    bootstrap = await Bootstrap .setConfigSources([{type: 'system'}]).configure({
      // logging:{
      //   level:'debug',enable:false,
      //   transports:[{console:{}}],
      //   loggers:[{name:'*',level:'debug'}]
      // },
      app: {path: appdir},
      storage:{default:TEST_STORAGE_OPTIONS},
      modules: {paths: [__dirname + '/../../..']}
    });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    await bootstrap.activateStorage();
    await bootstrap.startup();


  }

  static async after(){
    await bootstrap.shutdown();
  }

  @test
  async 'task command registered'() {
    let commands = bootstrap.getCommands();
    let command = commands.find(x => x instanceof TaskCommand);
    expect(command).to.exist;
    expect((<TaskCommand>command).command).to.eq('task');

  }

  @test
  async 'list tasks'() {
    Config.set('argv.local', true, 'system');
    let commands = bootstrap.getCommands();
    let command = commands.find(x => x instanceof TaskCommand);
    stdMocks.use();
    await command.handler({});
    stdMocks.restore();
    let results = stdMocks.flush();
    expect(results.stdout).to.have.length(2);
    expect(results.stdout[1]).to.contain('- test\n');
  }


  @test
  async 'exec tasks'() {
    Config.set('argv.local', true, 'system');
    let commands = bootstrap.getCommands();
    let command = commands.find(x => x instanceof TaskCommand);
    process.argv = ['blabla', 'task', 'test'];
    stdMocks.use();
    await command.handler({});
    stdMocks.restore();

    let results = stdMocks.flush();
    expect(results.stdout).to.have.length.gt(0);
    expect(_.find(results.stdout, x => /\"name\":\"test\"/.test(x) && /\"progress\":100,/.test(x))).to.exist;

    let ref :StorageRef = Container.get(C_STORAGE_DEFAULT);
    let res = await ref.getController().find(TaskLog);
    expect(res).to.have.length(1);
  }

}

