import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import {MetaArgs} from "../../../src";


@suite('functional/bootstrap/metaargs')
class BootstrapGeneralSpec {

  before() {
    MetaArgs.clear();
  }

  after() {
    MetaArgs.clear();
  }

  @test
  async 'set'() {
    MetaArgs.key('tmp').push('data');
    expect(MetaArgs.key('tmp')).to.deep.eq(['data']);
  }

}

