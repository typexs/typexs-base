import * as _ from 'lodash';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';

import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from '@allgemein/config';
import {TEST_STORAGE_OPTIONS} from '../config';
import {Container} from 'typedi';
import {Cache} from '../../../src/libs/cache/Cache';
import {MemoryCacheAdapter} from '../../../src/adapters/cache/MemoryCacheAdapter';
import {TestHelper} from '../TestHelper';
import {C_DEFAULT} from '@allgemein/base';

let bootstrap: Bootstrap = null;

@suite('functional/cache/memory')
class CacheMemorySpec {


  async before() {
    await TestHelper.clearCache();
    Bootstrap.reset();
    Config.clear();
  }

  async after() {
    bootstrap ? await bootstrap.shutdown() : null;
  }


  @test
  async 'use default runtime memory cache with default options'() {
    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure({
        app: {name: 'test'},
        modules: {paths: [__dirname + '/../../..'], disableCache: true},
        storage: {default: TEST_STORAGE_OPTIONS},
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();

    const cache: Cache = Container.get(Cache.NAME);

    const options = cache.getOptions();
    expect(options).to.deep.eq({
      bins: {default: 'default'}
    });

    const adapterClasses = cache.getAdapterClasses();
    expect(adapterClasses).to.have.length(2);
    expect(_.map(adapterClasses, c => c.type)).to.deep.eq(['memory', 'redis']);

    const adapters = cache.getAdapters();
    const instances = _.keys(adapters);
    expect(instances).to.be.deep.eq([C_DEFAULT]);
    expect(adapters[C_DEFAULT]).to.be.instanceOf(MemoryCacheAdapter);

    const bins = cache.getBins();
    const binKeys = _.keys(bins);
    expect(binKeys).to.be.deep.eq([C_DEFAULT]);
    expect(bins[C_DEFAULT].name).to.be.eq(C_DEFAULT);

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

    await bootstrap.shutdown();
  }


  @test
  async 'use runtime memory cache with options'() {
    let bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure({
        app: {name: 'test'},
        modules: {paths: [__dirname + '/../../..']},
        storage: {default: TEST_STORAGE_OPTIONS},
        cache: {bins: {default: 'mem1', test: 'mem2'}, adapter: {mem1: {type: 'memory'}, mem2: {type: 'memory'}}}
      });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();

    const cache: Cache = Container.get(Cache.NAME);

    const options = cache.getOptions();

    expect(options).to.deep.eq({
        bins: {default: 'mem1', test: 'mem2'},
        adapter:
          {
            mem1: {type: 'memory'},
            mem2: {type: 'memory'}
          }
      }
    );

    const adapterClasses = cache.getAdapterClasses();
    expect(adapterClasses).to.have.length(2);
    expect(_.map(adapterClasses, c => c.type)).to.deep.eq(['memory', 'redis']);

    const adapters = cache.getAdapters();
    const instances = _.keys(adapters);
    expect(instances).to.be.deep.eq(['mem1', 'default', 'mem2']);

    expect(adapters[C_DEFAULT]).to.be.eq(adapters['mem1']);
    expect(adapters['mem1']).to.be.instanceOf(MemoryCacheAdapter);
    expect(adapters['mem2']).to.be.instanceOf(MemoryCacheAdapter);

    const bins = cache.getBins();
    const binKeys = _.keys(bins);

    expect(binKeys).to.be.deep.eq([C_DEFAULT, 'test']);
    expect(bins[C_DEFAULT].store.name).to.be.eq('mem1');
    expect(bins['test'].store.name).to.be.eq('mem2');

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

    await bootstrap.shutdown();
  }

}

