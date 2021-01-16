import * as path from 'path';
import * as _ from 'lodash';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';

import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from '@allgemein/config';
import {TypeOrmStorageRef} from '../../../src/libs/storage/framework/typeorm/TypeOrmStorageRef';


@suite('functional/storage/schema_handler')
class GeneralSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }

  @test.skip()
  async 'loading schema handler adapters'() {

  }

  @test
  async 'storage bootstrap'() {
    const appdir = path.join(__dirname, 'fake_app_handler');
    let bootstrap = await Bootstrap
      .configure({
        app: {
          path: appdir
        },
        modules: {
          paths: [__dirname + '/../../..']
        }
      })
      .prepareRuntime();

    bootstrap = await bootstrap.activateStorage();

    const storageManager = bootstrap.getStorage();
    const storageRef: TypeOrmStorageRef = storageManager.get();


    const c = await storageRef.connect();
    let q = await c.manager.query('CREATE TABLE "hiddentable" ("id" integer PRIMARY KEY NOT NULL, "name" varchar NOT NULL)');
    q = await c.manager.query('SELECT name FROM sqlite_master WHERE type=\'table\';');

    const schemaHandler = storageRef.getSchemaHandler();
    const tableNames = await schemaHandler.getCollectionNames();
    expect(tableNames).to.have.length(6);
    expect(tableNames).to.have.members(_.map(q, _q => _q.name));

    const tables = await schemaHandler.getCollections(tableNames);
    expect(tables).to.have.length(6);
    expect(tableNames).to.have.members(_.map(tables, _q => _q.name));

    await bootstrap.shutdown();
    await bootstrap.getStorage().shutdown();
  }


}

