import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import * as path from "path";
import {Bootstrap} from "../../../src/Bootstrap";
import {Config} from "commons-config";
import * as _ from "lodash";
import {TaskCommand} from "../../../src";

let bootstrap: Bootstrap;

@suite('functional/commands/tasks')
class TasksSpec {


  static async before() {
    Bootstrap.reset();
    Config.clear();

    let appdir = path.join(__dirname, 'fake_app');
    bootstrap = await Bootstrap.configure({
      app: {path: appdir},
      modules: {paths: [__dirname + '/../../..']}
    });
    await bootstrap.prepareRuntime();
    await bootstrap.activateStorage();
    await bootstrap.startup();


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
    let commands = bootstrap.getCommands();
    let command = commands.find(x => x instanceof TaskCommand);
    let result = await command.handler({});
    expect(result).to.deep.eq(['test']);
  }


  @test
  async 'exec tasks'() {
    let commands = bootstrap.getCommands();
    let command = commands.find(x => x instanceof TaskCommand);
    process.argv = ['blabla', 'task', 'test'];
    let result = await command.handler({});
    expect(result).to.exist;
    expect(result.results).to.have.length(1);
    expect(_.find(result.results, x => x.name == 'test').result).to.deep.eq({res: 'okay'});

  }

}

