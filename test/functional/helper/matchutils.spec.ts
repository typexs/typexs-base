import {expect} from 'chai';
import {suite, test} from 'mocha-typescript';
import {MatchUtils} from '../../../src/libs/utils/MatchUtils';


@suite('functional/helper/matchutils')
class CountersSpec {

  @test
  async 'match pattern checks'() {
    let x = MatchUtils.isGlobPattern(__dirname);
    expect(x).to.be.false;

    x = MatchUtils.isGlobPattern(__dirname + '*');
    expect(x).to.be.true;
  }

}

