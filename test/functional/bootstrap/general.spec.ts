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

    let data = Config.jar().get('');
    expect(data).to.deep.eq({
      typexs: {app: {name: 'boottest'}},
      appdata: {loaded: true},
      super: 'yes'
    });
  }


  @test
  async 'load typexs modules'() {

    let p = path.join(__dirname, 'fake_app');
    let loader = new RuntimeLoader({
      appdir: p,
      paths: [path.join(p, 'node_modules')]
    });

    await loader.rebuild();
    let modules = loader.registry.modules();
    expect(modules).to.have.length(2);
    expect(_.find(modules, {name: 'module1'})).to.exist


    let activators = loader.classesLoader.getClasses('activator.js');
    expect(activators).to.have.length(1);
    expect(activators.shift().prototype.constructor.name).to.eq('Activator');

    let commands = loader.classesLoader.getClasses('commands');
    expect(commands).to.have.length(1);
    expect(commands.shift().prototype.constructor.name).to.eq('Xyz');

    let builders = loader.classesLoader.getClasses('builder');
    expect(builders).to.have.length(1);
    expect(builders.shift().prototype.constructor.name).to.eq('UnitBuilder');
  }


  @test
  async 'bootstrap app with modules'() {
    let appdir = path.join(__dirname, 'fake_app');

    Bootstrap.configure({app: {path: appdir}});

    let bootstrap = Bootstrap._();
    expect(bootstrap['_options']).to.be.deep.eq({
      app:
        {
          path: appdir,
          name: 'fake_app'
        },
      modules:
        {
          appdir: '.',
          libs:
            [
              {topic: 'activator.js', refs: ['Activator', 'src/Activator']},
              {topic: 'commands', refs: ['commands', 'src/commands']},
              {topic: 'generators', refs: ['generators', 'src/generators']},
              {topic: 'builder', refs: ['builder']},
              {topic: 'flow', refs: ['flow']}
            ],
          paths: []

        }
    });


    bootstrap = await bootstrap.prepareRuntime();
    await bootstrap.startup();
  }
}

