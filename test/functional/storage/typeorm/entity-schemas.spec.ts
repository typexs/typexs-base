import * as path from 'path';
import * as _ from 'lodash';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {IStorageOptions} from '../../../../src/libs/storage/IStorageOptions';
import {Bootstrap} from '../../../../src/Bootstrap';
import {Config} from '@allgemein/config';
import {TEST_STORAGE_OPTIONS} from '../../config';
import {TypeOrmStorageRef} from '../../../../src/libs/storage/framework/typeorm/TypeOrmStorageRef';
import {BaseConnectionOptions} from 'typeorm/connection/BaseConnectionOptions';


let bootstrap: Bootstrap;
let storageOptions: IStorageOptions & BaseConnectionOptions = null;

@suite('functional/storage/typeorm/entity-schemas')
class StorageGeneralSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
    storageOptions = _.cloneDeep(TEST_STORAGE_OPTIONS) as IStorageOptions & BaseConnectionOptions;
  }


  async after() {
    if (bootstrap) {
      await bootstrap.shutdown();
    }
  }


  @test
  async 'multiple schemas'() {
    const appdir = path.join(__dirname, 'apps', 'multi-schema');
    bootstrap = await Bootstrap.configure({
      app: {
        path: appdir
      },
      modules: {
        paths: [path.join(__dirname, '..', '..', '..', '..')],
        include: [],
        libs: [{
          topic: 'entity.fake',
          refs: [
            'entities/fake'
          ]
        }]
      }
    }).prepareRuntime();
    bootstrap = await bootstrap.activateStorage();

    const storageManager = bootstrap.getStorage();
    const storageDefault: TypeOrmStorageRef = storageManager.get('default');
    const storageFake: TypeOrmStorageRef = storageManager.get('fake');

    expect(storageDefault.getOptions()).to.deep.include({
      name: 'default',
      type: 'sqlite',
      database: ':memory:'
    });

    expect(storageFake.getOptions()).to.deep.include({
      name: 'fake',
      type: 'sqlite',
      database: ':memory:'
    });

    const storageDefaultEntityNames = storageDefault.getEntityNames();
    expect(storageDefaultEntityNames).to.have.length.gt(1);
    expect(storageDefaultEntityNames).to.include.members(['Car']);

    const storageFakeEntityNames = storageFake.getEntityNames();
    expect(storageFakeEntityNames).to.have.length.gte(1);
    expect(storageFakeEntityNames).to.include.members(['Driver']);

    const schemaDefaultRefs = storageDefault.getSchemaRefs();
    expect(schemaDefaultRefs).to.have.length(1);
    expect(schemaDefaultRefs[0].name).to.be.eq('default');

    const schemaFakeRefs = storageFake.getSchemaRefs();
    expect(schemaFakeRefs).to.have.length(1);
    expect(schemaFakeRefs[0].name).to.be.eq('fake');

    let entities = schemaDefaultRefs[0].getEntityRefs();
    expect(entities.map(x => x.name)).to.include.members(['Car']);

    entities = schemaFakeRefs[0].getEntityRefs();
    expect(entities.map(x => x.name)).to.include.members(['Driver']);
  }
}

