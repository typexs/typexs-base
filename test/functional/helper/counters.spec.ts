import {expect} from 'chai';
import {suite, test} from '@testdeck/mocha';
import {TestHelper} from '../TestHelper';
import {Counters} from '../../../src/libs/helper/Counters';

@suite('functional/helper/counters')
class CountersSpec {

  @test
  async 'empty counter'() {
    const c = new Counters();
    const obj = c.asObject();
    expect(obj).to.be.deep.eq({});
  }


  @test
  async 'use counter keys'() {

    const c = new Counters();
    const c1 = c.get('inc');
    expect(c1.value).to.be.eq(0);

    const v1 = c.get('inc').inc();
    expect(c1.value).to.be.eq(1);
    expect(v1).to.be.eq(1);

    const v2 = c.get('test').inc();
    expect(v2).to.be.eq(1);

    const v3 = c.get('test').inc();
    expect(v3).to.be.eq(2);

    const v4 = c.get('sub.test').inc();
    expect(v4).to.be.eq(1);

    const obj = c.asObject();
    expect(obj).to.be.deep.eq({inc: 1, test: 2, sub: {test: 1}});

  }

}

