import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {TestEntity} from './fake_app/entities/TestEntity';
import {Storage} from '../../../src/libs/storage/Storage';
import {Invoker} from '../../../src/base/Invoker';
import {Injector} from '../../../src/libs/di/Injector';
import {TypeOrmStorage} from '../../../src/adapters/storage/typeorm/TypeOrmStorage';
import {SqliteSchemaHandler} from '../../../src/adapters/storage/typeorm/SqliteSchemaHandler';
import {StorageApi} from '../../../src/api/Storage.api';

@suite('functional/storage/standalone/configuration')
class StorageStandaloneConfigurationSpec {

  /**
   * Storage controller uses invoker getting it by injector so reset before test
   */
  before() {
    Injector.reset();
    const invoker = new Invoker();
    Injector.set(Invoker.NAME, invoker);

    // const apis = MetaArgs.key(K_CLS_USE_API);
    // [StorageApi].forEach(api => {
    //   invoker.register(api, apis.filter(x => x.api === api).map(x => x.target));
    // });

    // const apis = MetaArgs.key(K_CLS_USE_API);
    [StorageApi].forEach(api => {
      invoker.register(api, []);
    });

  }

  @test
  async 'default'() {
    const config = {
      default: <any>{
        synchronize: true,
        extends: 'default',
        type: 'sqlite',
        database: ':memory:',
        entities: [TestEntity]
        // logging: 'all',
        // logger: 'simple-console'
      }
    };
    const _storage = new Storage();
    // add used framework
    const framework = await _storage.registerFramework(TypeOrmStorage);
    // add handler for sqlite in typeorm
    framework.registerSchemaHandler(SqliteSchemaHandler);
    await _storage.prepare(config);
    const storage = _storage.get();

    expect(storage.getDeclaredEntities()).to.be.length(1);

    const testEntity = new TestEntity();
    testEntity.id = 1;
    testEntity.name = 'hallo';

    await storage.getController().save(testEntity);
    let results = null;

    results = await storage.getController().find(TestEntity, null);
    expect(results).to.be.length(1);


    results = await storage.getController().find(TestEntity, null);
    expect(results).to.be.length(1);

  }


}

