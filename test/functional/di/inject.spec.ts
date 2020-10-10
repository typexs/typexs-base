import {suite, test} from '@testdeck/mocha';
import {Injector} from '../../../src/libs/di/Injector';
import {StaticService} from './StaticService';
import {expect} from 'chai';
import {DynamicService} from './DynamicService';

@suite('functional/di/inject')
class InjectSpec {


  @test
  async 'test dynamic creation'() {
    const dyn01: StaticService = Injector.create(StaticService);
    expect(dyn01.some).to.be.eq('Initial');
    dyn01.some = 'Init01';

    // check that not registered
    const dyn02: StaticService = Injector.create(StaticService);
    expect(dyn02.some).to.be.eq('Initial');

    // injects StaticService which will be in the context a singleton
    const dyn03: DynamicService = Injector.create(DynamicService);
    expect(dyn03.service.some).to.be.eq('Initial');
    expect(dyn03.value).to.be.eq('Startup!');
    dyn03.value = 'Test03';
    dyn03.service.some = 'Test03';

    const dyn04: DynamicService = Injector.create(DynamicService);
    expect(dyn04.service.some).to.be.eq(dyn03.service.some);
    expect(dyn04.value).to.be.eq('Startup!');
  }

}

