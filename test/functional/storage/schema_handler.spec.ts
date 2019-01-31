import * as path from "path";
import * as _ from 'lodash';
import {suite, test} from "mocha-typescript";
import {expect} from "chai";

import {Bootstrap} from "../../../src/Bootstrap";
import {Config} from "commons-config";


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
    let appdir = path.join(__dirname, 'fake_app_handler');
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

    let storageManager = bootstrap.getStorage();
    let storageRef = storageManager.get();


    let c = await storageRef.connect();
    let q = await c.manager.query('CREATE TABLE "hiddentable" ("id" integer PRIMARY KEY NOT NULL, "name" varchar NOT NULL)');
    q = await c.manager.query('SELECT name FROM sqlite_master WHERE type=\'table\';');

    let schemaHandler = storageRef.getSchemaHandler();
    let tableNames = await schemaHandler.getCollectionNames();
    expect(tableNames).to.have.length(4);
    expect(tableNames).to.have.members(_.map(q, _q => _q.name));

    let tables = await schemaHandler.getCollections(tableNames);
    expect(tables).to.have.length(4);
    expect(tableNames).to.have.members(_.map(tables, _q => _q.name));

  }


}

