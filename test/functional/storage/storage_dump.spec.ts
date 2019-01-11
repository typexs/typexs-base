import * as fs from "fs";
import * as path from "path";
import * as _ from 'lodash';
import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import {IStorageOptions, StorageRef} from "../../../src";

import {Bootstrap} from "../../../src/Bootstrap";
import {Config} from "commons-config";
import {BeforeInsert, Column, Entity, PrimaryColumn} from "typeorm";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {X1} from "./entities/X1";
import {Y1} from "./entities/Y1";
import {inspect} from "util";


export const TEST_STORAGE_OPTIONS: IStorageOptions = <SqliteConnectionOptions>{
  name: 'default',
  type: "sqlite",
  database: ":memory:",
  synchronize: true,

  // tablesPrefix: ""

};


@suite('functional/storage/storage_dump')
class Storage_dumpSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }



  @test.skip()
  async 'dump'() {
    /*
    let appdir = path.join(__dirname, 'fake_app');
    let bootstrap = await Bootstrap.configure({
      app: {path: appdir},
      modules: {paths: [__dirname + '/../../..']}
    }).prepareRuntime();
    bootstrap = await bootstrap.activateStorage();

    let storageManager = bootstrap.getStorage();
    let storageRef = storageManager.get('default');
    let handler = storageRef.getSchemaHandler();
    let collectionNames = await handler.getCollectionNames();
    console.log(collectionNames);
    let connection = await storageRef.connect();
    let tables = await connection.manager.connection.createQueryRunner().getTables(collectionNames);
    console.log(inspect(tables,false,10));
*/

  }

}

