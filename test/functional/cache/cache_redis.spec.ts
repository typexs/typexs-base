import * as _ from 'lodash';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';

import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from '@allgemein/config';
import {TEST_STORAGE_OPTIONS} from '../config';
import {Container} from 'typedi';
import {Cache} from '../../../src/libs/cache/Cache';
import {RedisCacheAdapter} from '../../../src/adapters/cache/RedisCacheAdapter';
import {TestHelper} from '../TestHelper';
import {C_DEFAULT} from '@allgemein/base';

let bootstrap: Bootstrap = null;

@suite('functional/cache/redis')
class CacheRedisSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }

  async after() {
    bootstrap ? await bootstrap.shutdown() : null;
  }


  @test
  async 'use redis cache with options'() {
    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure({
        app: {name: 'test'},
        modules: {paths: [__dirname + '/../../..']},
        storage: {default: TEST_STORAGE_OPTIONS},
        cache: {bins: {default: 'redis1'}, adapter: {redis1: {type: 'redis', host: '127.0.0.1', port: 6379}}}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();

    const cache: Cache = Container.get(Cache.NAME);

    const options = cache.getOptions();

    expect(options).to.deep.eq({
        bins: {default: 'redis1'},
        adapter:
          {
            redis1: {type: 'redis', host: '127.0.0.1', port: 6379}
          }
      }
    );

    const adapterClasses = cache.getAdapterClasses();
    expect(adapterClasses).to.have.length(2);
    expect(_.map(adapterClasses, c => c.type)).to.deep.eq(['memory', 'redis']);

    const adapters = cache.getAdapters();
    const instances = _.keys(adapters);
    expect(instances).to.be.deep.eq(['redis1', 'default']);

    expect(adapters[C_DEFAULT]).to.be.eq(adapters['redis1']);
    expect(adapters['redis1']).to.be.instanceOf(RedisCacheAdapter);


    const bins = cache.getBins();
    const binKeys = _.keys(bins);

    expect(binKeys).to.be.deep.eq([C_DEFAULT]);
    expect(bins[C_DEFAULT].store.name).to.be.eq('redis1');

    await bins[C_DEFAULT].store.clearBin('default');
    await bins[C_DEFAULT].store.clearBin('test');


    let noValue = await cache.get('test');
    expect(noValue).to.be.eq(null);

    await cache.set('test', {k: 'asd'});

    let testValue = await cache.get('test');
    expect(testValue).to.be.deep.eq({k: 'asd'});

    const testBin = 'test';
    noValue = await cache.get('test', testBin);
    expect(noValue).to.be.eq(null);

    await cache.set('test', {k: 'asd'}, testBin);

    testValue = await cache.get('test', testBin);
    expect(testValue).to.be.deep.eq({k: 'asd'});

    await cache.set('test2', 'asdasdasd', testBin);

    testValue = await cache.get('test2', testBin);
    expect(testValue).to.be.deep.eq('asdasdasd');

    // expire by EX
    const v = {k: 'data2'};
    await cache.set('test3', v, testBin, {ttl: 2000});
    await TestHelper.wait(20);
    testValue = await cache.get('test3', testBin);
    expect(testValue).to.be.deep.eq(v);

    await TestHelper.wait(2500);
    testValue = await cache.get('test3', testBin);
    expect(testValue).to.be.null;

    // expire by PX
    const v2 = {k: 'data3'};
    await cache.set('test4', v2, testBin, {ttl: 1234});
    await TestHelper.wait(20);
    testValue = await cache.get('test4', testBin);
    expect(testValue).to.be.deep.eq(v2);

    await TestHelper.wait(1234);
    testValue = await cache.get('test4', testBin);
    expect(testValue).to.be.null;

    await bootstrap.shutdown();
  }

}

