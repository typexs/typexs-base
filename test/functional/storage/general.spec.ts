import * as _ from 'lodash';
import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import {IStorageOptions, StorageRef} from "../../../src";
import * as path from "path";
import {Bootstrap} from "../../../src/Bootstrap";
import {Config} from "commons-config";
import {Entity, PrimaryColumn} from "typeorm";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";


export const TEST_STORAGE_OPTIONS: IStorageOptions = <SqliteConnectionOptions>{
  name: 'default',
  type: "sqlite",
  database: ":memory:",
  synchronize: true,

  // tablesPrefix: ""

};


@suite('functional/storage/general')
class GeneralSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }


  @test
  async 'storage options override'() {
    let opt1: IStorageOptions = {name: 'default', type: 'sqlite', entityPrefix: 'test'};
    let opt2: IStorageOptions = {name: 'default2', type: 'postgres'};
    let options: IStorageOptions = _.merge(opt1, opt2);
    expect(options).to.be.deep.eq({name: 'default2', type: 'postgres', entityPrefix: 'test'});
  }


  @test
  async 'storage bootstrap'() {
    let appdir = path.join(__dirname, 'fake_app');
    let bootstrap = await Bootstrap.configure({app: {path: appdir}}).prepareRuntime();
    bootstrap = await bootstrap.activateStorage();

    let storageManager = bootstrap.getStorage();
    let storage = storageManager.get();

    expect(storage['options']).to.deep.include({
      name: 'default',
      type: 'sqlite',
      database: ':memory:'
    });

    let entityNames = [];
    for (let fn of storage['options']['entities']) {
      entityNames.push((<Function>fn).prototype.constructor.name);
    }
    expect(entityNames).to.be.deep.eq([
      'ModuleEntity', 'TestEntity'
    ]);
  }

  @test
  async 'dynamically add entity class'() {



    class X {
      @PrimaryColumn()
      id: number;
    }

    let storage = new StorageRef(TEST_STORAGE_OPTIONS);
    await storage.prepare();

    storage.addEntityClass(X,"xtable");
    await storage.reload();
    expect(storage['options'].entities).has.length(1);

    let c = await storage.connect();
    let q = await c.manager.query('SELECT * FROM sqlite_master WHERE type=\'table\';');
    expect(q).has.length(1);

  }


}

