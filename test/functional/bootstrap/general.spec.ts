import * as path from 'path';
import * as _ from 'lodash';
import {suite, test, timeout} from "mocha-typescript";
import {expect} from "chai";

import {Bootstrap} from "../../../src/Bootstrap";
import {Config} from "commons-config";
import {RuntimeLoader} from "../../../src/base/RuntimeLoader";
import {inspect} from "util";


@suite('functional/bootstrap/general')
class BootstrapGeneralSpec {

  before() {
    Bootstrap.reset();
    Config.clear();
  }

  @test
  async 'add additional config options'() {

    Bootstrap._({
      app: {
        path: __dirname
      }
    });

    let cfg = Bootstrap.addConfigOptions({
      configs: [{type: 'file', file: './config/super.json'}]
    });

    expect(cfg.configs).to.deep.include({
      type: 'file',
      file: './config/super.json'
    });

    Bootstrap.configure();

    let data = Config.get('', 'typexs');
    expect(data).to.deep.include(
      {app: {name: 'boottest', path: __dirname}}
    );

    data = Config.get('', 'default');
    expect(data).to.deep.eq({
      appdata: {loaded: true},
      super: 'yes'
    });

    data = Config.get();
    expect(data).to.deep.include({
      app: {name: 'boottest', path: __dirname},
      appdata: {loaded: true},
      super: 'yes'
    });
  }


  @test
  async 'load typexs modules'() {

    let p = path.join(__dirname, 'fake_app');
    let loader = new RuntimeLoader({
      appdir: p
    });

    await loader.rebuild();
    let modules = loader.registry.modules();
    expect(modules).to.have.length(3);
    expect(_.find(modules, {name: 'module1'})).to.exist
    expect(_.find(modules, {name: 'module2'})).to.not.exist

    let activators = loader.classesLoader.getClasses('activator.js');
    expect(activators).to.have.length(1);
    expect(activators.shift().prototype.constructor.name).to.eq('Activator');

    let commands = loader.classesLoader.getClasses('commands');
    expect(commands).to.have.length(1);
    expect(commands.shift().prototype.constructor.name).to.eq('Xyz');

    let builders = loader.classesLoader.getClasses('builder');
    expect(builders).to.have.length(1);
    expect(builders.shift().prototype.constructor.name).to.eq('UnitBuilder');

    loader = null;
  }


  @test
  async 'bootstrap app with modules'() {
    Bootstrap.reset();
    Config.clear();
    let appdir = path.join(__dirname, 'fake_app');

    let bootstrap = Bootstrap.configure({app: {path: appdir}});
    bootstrap = await bootstrap.prepareRuntime();

    expect(bootstrap['_options']).to.be.deep.include({
      app: {
        path: appdir,
        name: 'fake_app'
      },
      modules: {
        appdir: appdir,
        libs:
          [
            {topic: 'activator.js', refs: ['Activator', 'src/Activator']},
            {
              "refs": [
                "builder"
              ],
              "topic": "builder",
            },
            {topic: 'commands', refs: ['commands', 'src/commands']},
            {
              "refs": [
                "entity",
                "src/entity",
                "shared/entity",
                "src/shared/entity",
              ],
              "topic": "entity.default"
            },
            {topic: 'flow', refs: ['flow']},
            {topic: 'generators', refs: ['generators', 'src/generators']},


          ],
        paths: [appdir]
      }
    });


    await bootstrap.startup();

  }

}

