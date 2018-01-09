import * as _ from 'lodash';
import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import {IStorageOptions} from "../../../src";
import * as path from "path";
import {Bootstrap} from "../../../src/Bootstrap";
import {Config} from "commons-config";


@suite('functional/commands/general')
class GeneralSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }


  @test
  async 'load dummy command'() {
    let appdir = path.join(__dirname, 'fake_app');
    let bootstrap = await Bootstrap.configure({app: {path: appdir}}).prepareRuntime();
    await bootstrap.activateStorage();

    let commands = bootstrap.getCommands();
    expect(commands).to.have.length(1);

    let result = await commands[0].handler({});
    expect(result).to.deep.eq({
      name: 'default',
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: []
    });


  }


}

