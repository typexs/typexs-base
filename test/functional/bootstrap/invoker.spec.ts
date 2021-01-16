import * as path from 'path';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';

import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from '@allgemein/config';
import {RuntimeLoader} from '../../../src/base/RuntimeLoader';
import {Container} from 'typedi';
import {Invoker} from '../../../src/base/Invoker';
import {K_CLS_API, K_CLS_USE_API} from '../../../src/libs/Constants';
import {AwesomeApi} from './fake_app/src/api/Awesome.api';
import {TestHelper} from '../TestHelper';


@suite('functional/bootstrap/invoker')
class InvokerSpec {

  async before() {
    await TestHelper.clearCache();
    Bootstrap.reset();
    Config.clear();
  }


  @test
  async 'api invoker dev'() {

    let p = path.join(__dirname, 'fake_app');
    let loader = new RuntimeLoader({
      appdir: p,
      libs: [
        {topic: K_CLS_API, refs: ['src/api/*.api.*']},
        {topic: K_CLS_USE_API, refs: ['src/extend/*']},
      ]
    });
    Container.set(RuntimeLoader.NAME, loader);
    await loader.rebuild();

    let invoker = new Invoker();
    await Bootstrap.prepareInvoker(invoker, loader);
    expect(invoker.has(AwesomeApi)).to.be.true;
    expect(invoker.hasImpl(AwesomeApi)).to.be.true;

    let api = invoker.use(AwesomeApi);
    expect(api.doSomethingGreat).to.exist;
    let ret = await api.doSomethingGreat('data');
    expect(ret).to.be.deep.eq(['work done with data']);


    api = invoker.use(AwesomeApi);
    expect(api.doNotSomethingGreat).to.exist;
    ret = await api.doNotSomethingGreat('data');
    expect(ret).to.be.deep.eq([null]);

  }


}

