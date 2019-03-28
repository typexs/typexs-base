import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';
import {Log} from "../../../src/libs/logging/Log";
import {Tasks} from "../../../src";


@suite('functional/tasks/access')
class Tasks_accessSpec {


  static before() {
    Log.options({level: 'debug', enable: true});
  }


  @test
  async 'allow all by default'() {
    let t = new Tasks('testaccess');
    t.setConfig({
      access: []
    });

    let erg = t.access('hallo');
    expect(erg).to.be.true;
    let ref = t.addTask('hallo', function (done: Function) {
      done();
    });
    expect(ref).to.not.be.null;
  }


  @test
  async 'deny all '() {
    let t = new Tasks('testaccess');
    t.setConfig({
      access: [{task: '*', access: 'deny'}]
    });

    let erg = t.access('hallo');
    expect(erg).to.be.false;
    let ref = t.addTask('hallo', function (done: Function) {
      done();
    });
    expect(ref).to.be.null;
  }

  @test
  async 'allow one task explicit the other is by default allowed'() {
    let t = new Tasks('testaccess');
    t.setConfig({
      access: [{task: 'hallo', access: 'allow'}]
    });

    let erg = t.access('hallo');
    expect(erg).to.be.true;
    let ref = t.addTask('hallo', function (done: Function) {
      done();
    });
    expect(ref).to.not.be.null;

    let erg2 = t.access('hallo_welt');
    expect(erg2).to.be.true;
    let ref2 = t.addTask('hallo_welt', function (done: Function) {
      done();
    });
    expect(ref2).to.not.be.null;
  }


  @test
  async 'deny one task explicit the other is by default allowed'() {
    let t = new Tasks('testaccess');
    t.setConfig({
      access: [{task: 'hallo', access: 'deny'}]
    });

    let erg = t.access('hallo');
    expect(erg).to.be.false;
    let ref = t.addTask('hallo', function (done: Function) {
      done();
    });
    expect(ref).to.be.null;

    let erg2 = t.access('hallo_welt');
    expect(erg2).to.be.true;
    let ref2 = t.addTask('hallo_welt', function (done: Function) {
      done();
    });
    expect(ref2).to.not.be.null;
  }




  @test
  async 'deny all allow one'() {
    let t = new Tasks('testaccess');
    t.setConfig({
      access: [{task: '*', access: 'deny'},{task: 'hallo_*', access: 'allow'}]
    });

    let erg = t.access('hallo');
    expect(erg).to.be.false;
    let ref = t.addTask('hallo', function (done: Function) {
      done();
    });
    expect(ref).to.be.null;

    let erg2 = t.access('hallo_welt');
    expect(erg2).to.be.true;
    let ref2 = t.addTask('hallo_welt', function (done: Function) {
      done();
    });
    expect(ref2).to.not.be.null;
  }

}

