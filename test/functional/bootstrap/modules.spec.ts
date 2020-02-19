import * as path from 'path';
import * as _ from 'lodash';
import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';

import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from 'commons-config';
import {RuntimeLoader} from '../../../src/base/RuntimeLoader';


@suite('functional/bootstrap/modules')
class BootstrapGeneralSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }


  @test
  async 'load typexs modules'() {

    const p = path.join(__dirname, 'fake_app');
    let loader = new RuntimeLoader({
      appdir: p
    });

    await loader.rebuild();
    const modules = loader.registry.modules();
    expect(modules).to.have.length(3);
    expect(_.find(modules, {name: 'module1'})).to.exist;
    expect(_.find(modules, {name: 'module2'})).to.not.exist;

    const activators = loader.classesLoader.getClasses('activator.js');
    expect(activators).to.have.length(2);
    expect(activators.shift().prototype.constructor.name).to.eq('Activator');

    const commands = loader.classesLoader.getClasses('commands');
    expect(commands).to.have.length(1);
    expect(commands.shift().prototype.constructor.name).to.eq('Xyz');

    const builders = loader.classesLoader.getClasses('builder');
    expect(builders).to.have.length(1);
    expect(builders.shift().prototype.constructor.name).to.eq('UnitBuilder');

    loader = null;
  }


  @test
  async 'load typexs modules with restriction'() {

    const p = path.join(__dirname, 'fake_app');
    let loader = new RuntimeLoader({
      appdir: p,
      included: {
        module1: {
          enabled: false
        }
      }
    });

    await loader.rebuild();
    const modules = loader.registry.modules();
    expect(modules).to.have.length(2);
    expect(_.find(modules, {name: 'module1'})).to.not.exist;
    expect(modules.map(x => x.name)).to.be.deep.eq(['module3', 'fake_app']);


    loader = null;
  }

  @test
  async 'load typexs modules with match pattern restriction'() {

    const p = path.join(__dirname, 'fake_app');
    let loader = new RuntimeLoader({
      appdir: p,
      match: [
        {name: 'module*', enabled: false}
      ]
    });

    await loader.rebuild();
    const modules = loader.registry.modules();
    expect(modules).to.have.length(1);
    expect(modules.map(x => x.name)).to.be.deep.eq(['fake_app']);
    loader = null;
  }


  @test
  async 'load typexs modules with match restriction and allowance'() {

    const p = path.join(__dirname, 'fake_app');
    let loader = new RuntimeLoader({
      appdir: p,
      match: [
        {name: 'module*', enabled: false},
        {name: 'module1', enabled: true},
      ]
    });

    await loader.rebuild();
    const modules = loader.registry.modules();
    expect(modules).to.have.length(2);
    expect(modules.map(x => x.name)).to.be.deep.eq(['module1', 'fake_app']);
    loader = null;
  }


}
