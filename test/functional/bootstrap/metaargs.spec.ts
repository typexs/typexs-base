import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import {MetaArgs} from "../../../src";


@suite('functional/bootstrap/metaargs')
class BootstrapGeneralSpec {


  before() {
    delete MetaArgs.$()['tmp'];
  }

  after() {
    delete MetaArgs.$()['tmp'];
  }

  @test
  async 'set'() {
    MetaArgs.key('tmp').push('data');
    expect(MetaArgs.key('tmp')).to.deep.eq(['data']);
  }

}

