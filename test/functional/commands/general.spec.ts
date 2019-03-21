import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import * as path from "path";
import {Bootstrap} from "../../../src/Bootstrap";
import {Config} from "commons-config";
import * as _ from "lodash";

@suite('functional/commands/general')
class GeneralSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }


  @test
  async 'load dummy command'() {
    let appdir = path.join(__dirname, 'fake_app');
    let bootstrap = await Bootstrap.configure({
      app: {path: appdir},
      modules: {paths: [__dirname + '/../../..']}
    });
    await bootstrap.prepareRuntime();
    await bootstrap.activateStorage();
    await bootstrap.startup();


    let commands = bootstrap.getCommands();
    expect(commands.length).to.be.gt(0);

    let command = _.find(commands, e => e.command == 'dummy');

    let result = await command.handler({});
    expect(result).to.deep.include({
      connectOnStartup: false,
      name: 'default',
      type: 'sqlite',
      database: ':memory:',
      synchronize: true
    });


  }


}

