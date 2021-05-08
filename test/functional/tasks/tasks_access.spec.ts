import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {Log} from '../../../src/libs/logging/Log';

import {TestHelper} from '../TestHelper';
import {Tasks} from '../../../src/libs/tasks/Tasks';
import {RegistryFactory} from '@allgemein/schema-api';
import {C_TASKS} from '../../../src/libs/tasks/Constants';

const LOG_EVENT = TestHelper.logEnable(false);
let t: Tasks;

@suite('functional/tasks/access')
class TasksAccessSpec {


  static async before() {
    await TestHelper.clearCache();
    Log.options({level: 'debug', enable: LOG_EVENT});
    RegistryFactory.remove(C_TASKS);
    RegistryFactory.register(/^tasks\.?/, Tasks);

  }



  before() {
    t = RegistryFactory.get(C_TASKS) as Tasks;
    t.setNodeId('testaccess');
  }

  after() {
    t.reset();
    RegistryFactory.remove(C_TASKS);
  }


  @test
  async 'allow all by default'() {
    t.setConfig({
      access: []
    });

    const erg = t.access('hallo');
    expect(erg).to.be.true;
    const ref = t.addTask('hallo', function (done: Function) {
      done();
    });
    expect(ref).to.not.be.null;
  }


  @test
  async 'deny all '() {
    t.setConfig({
      access: [{task: '*', access: 'deny'}]
    });

    const erg = t.access('hallo');
    expect(erg).to.be.false;
    const ref = t.addTask('hallo', function (done: Function) {
      done();
    });
    expect(ref).to.be.null;
  }

  @test
  async 'allow one task explicit the other is by default allowed'() {
    t.setConfig({
      access: [{task: 'hallo', access: 'allow'}]
    });

    const erg = t.access('hallo');
    expect(erg).to.be.true;
    const ref = t.addTask('hallo', function (done: Function) {
      done();
    });
    expect(ref).to.not.be.null;

    const erg2 = t.access('hallo_welt');
    expect(erg2).to.be.true;
    const ref2 = t.addTask('hallo_welt', function (done: Function) {
      done();
    });
    expect(ref2).to.not.be.null;
  }


  @test
  async 'deny one task explicit the other is by default allowed'() {
    t.setConfig({
      access: [{task: 'hallo', access: 'deny'}]
    });

    const erg = t.access('hallo');
    expect(erg).to.be.false;
    const ref = t.addTask('hallo', function (done: Function) {
      done();
    });
    expect(ref).to.be.null;

    const erg2 = t.access('hallo_welt');
    expect(erg2).to.be.true;
    const ref2 = t.addTask('hallo_welt', function (done: Function) {
      done();
    });
    expect(ref2).to.not.be.null;
  }




  @test
  async 'deny all allow one'() {
    t.setConfig({
      access: [{task: '*', access: 'deny'}, {task: 'hallo_*', access: 'allow'}]
    });

    const erg = t.access('hallo');
    expect(erg).to.be.false;
    const ref = t.addTask('hallo', function (done: Function) {
      done();
    });
    expect(ref).to.be.null;

    const erg2 = t.access('hallo_welt');
    expect(erg2).to.be.true;
    const ref2 = t.addTask('hallo_welt', function (done: Function) {
      done();
    });
    expect(ref2).to.not.be.null;
  }

}

