import * as path from 'path';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from '@allgemein/config';
import {TestEntity} from './fake_app/entities/TestEntity';


let bootstrap: Bootstrap = null;

@suite('functional/storage/configuration')
class StorageConfigurationSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }


  @test
  async 'option: extends'() {
    const appdir = path.join(__dirname, 'fake_app');
    bootstrap = await Bootstrap.configure({
      app: {path: appdir},
      modules: {
        paths: [__dirname + '/../../..'],
        include: []
      },
      logging: {
        enable: false
      },
      storage: {
        default2: <any>{
          synchronize: true,
          extends: 'default',
          type: 'sqlite',
          database: ':memory:',
          // logging: 'all',
          // logger: 'simple-console'
        }
      }
    }).prepareRuntime();
    bootstrap = await bootstrap.activateStorage();

    const storageManager = bootstrap.getStorage();
    const storage = storageManager.get('default');
    const storage2 = storageManager.get('default2');


    expect(storage.getOptions().entities).to.be.length(4);
    expect(storage2.getOptions().entities).to.be.length(4);

    const testEntity = new TestEntity();
    testEntity.id = 1;
    testEntity.name = 'hallo';

    await storage.getController().save(testEntity);
    let results = await storage2.getController().find(TestEntity, null);
    expect(results).to.be.length(0);

    results = await storage.getController().find(TestEntity, null);
    expect(results).to.be.length(1);

    await storage2.getController().save(testEntity);

    results = await storage2.getController().find(TestEntity, null);
    expect(results).to.be.length(1);

    results = await storage.getController().find(TestEntity, null);
    expect(results).to.be.length(1);

  }

  async after() {
    if (bootstrap) {
      await bootstrap.shutdown();
    }

  }


}

