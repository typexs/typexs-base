import * as _ from 'lodash';
import {suite, test} from "mocha-typescript";
import {expect} from "chai";

import {Bootstrap} from "../../../src/Bootstrap";
import {Config} from "commons-config";
import {TEST_STORAGE_OPTIONS} from "../config";
import {Container} from "typedi";
import {XS_DEFAULT} from "commons-schema-api";
import {Cache} from "../../../src/libs/cache/Cache";
import {RedisCacheAdapter} from "../../../src/adapters/cache/RedisCacheAdapter";

@suite('functional/cache/cache_redis')
class Cache_redisSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }


  @test
  async 'use redis cache with options'() {
    let bootstrap = Bootstrap
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

    let cache: Cache = Container.get(Cache.NAME);

    let options = cache.getOptions();

    expect(options).to.deep.eq({
        bins: {default: 'redis1'},
        adapter:
          {
            redis1: {type: 'redis', host: '127.0.0.1', port: 6379}
          }
      }
    );

    let adapterClasses = cache.getAdapterClasses();
    expect(adapterClasses).to.have.length(2);
    expect(_.map(adapterClasses, c => c.type)).to.deep.eq(['memory', 'redis']);

    let adapters = cache.getAdapters();
    let instances = _.keys(adapters);
    expect(instances).to.be.deep.eq(['redis1', 'default']);

    expect(adapters[XS_DEFAULT]).to.be.eq(adapters['redis1']);
    expect(adapters['redis1']).to.be.instanceOf(RedisCacheAdapter);


    let bins = cache.getBins();
    let binKeys = _.keys(bins);

    expect(binKeys).to.be.deep.eq([XS_DEFAULT]);
    expect(bins[XS_DEFAULT].store.name).to.be.eq('redis1');

    await bins[XS_DEFAULT].store.clearBin('default');
    await bins[XS_DEFAULT].store.clearBin('test');


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

    await cache.set('test2', "asdasdasd", testBin);

    testValue = await cache.get('test2', testBin);
    expect(testValue).to.be.deep.eq("asdasdasd");

    await bootstrap.shutdown();
  }

}

