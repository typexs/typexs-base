import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';
import {Log} from '../../../src/libs/logging/Log';

import {TestHelper} from '../TestHelper';
import {Tasks} from '../../../src/libs/tasks/Tasks';

const LOG_EVENT = TestHelper.logEnable(false);

@suite('functional/tasks/access')
class TasksAccessSpec {


  static async before() {
    await TestHelper.clearCache();
    Log.options({level: 'debug', enable: LOG_EVENT});
  }


  @test
  async 'allow all by default'() {
    const t = new Tasks('testaccess');
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
    const t = new Tasks('testaccess');
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
    const t = new Tasks('testaccess');
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
    const t = new Tasks('testaccess');
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
    const t = new Tasks('testaccess');
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

