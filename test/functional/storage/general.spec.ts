import * as fs from "fs";
import * as path from "path";
import * as _ from 'lodash';
import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import {Invoker, IStorageOptions, StorageRef} from "../../../src";

import {Bootstrap} from "../../../src/Bootstrap";
import {Config} from "commons-config";
import {BeforeInsert, Column, Entity, PrimaryColumn} from "typeorm";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {X1} from "./entities/X1";
import {Y1} from "./entities/Y1";
import {TEST_STORAGE_OPTIONS} from "../config";
import {Container} from "typedi";

@suite('functional/storage/general')
class GeneralSpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }


  @test
  async 'storage options override'() {
    let opt1: IStorageOptions = {name: 'default', type: 'sqlite', entityPrefix: 'test', connectOnStartup: true};
    let opt2: IStorageOptions = {name: 'default2', type: 'postgres', connectOnStartup: true};
    let options: IStorageOptions = _.merge(opt1, opt2);
    expect(options).to.be.deep.eq({name: 'default2', type: 'postgres', entityPrefix: 'test', connectOnStartup: true});
  }


  @test
  async 'storage bootstrap'() {
    let appdir = path.join(__dirname, 'fake_app');
    let bootstrap = await Bootstrap.configure({
      app: {path: appdir},
      modules: {paths: [__dirname + '/../../..']}
    }).prepareRuntime();
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
  async 'dynamically add entity class in db memory'() {

    class X {
      @PrimaryColumn()
      id: number;
    }

    let invoker = new Invoker();
    Container.set(Invoker.NAME,invoker);

    let storage = new StorageRef(TEST_STORAGE_OPTIONS);
    await storage.prepare();

    storage.addEntityClass(X, "xtable");
    await storage.reload();
    expect(storage['options'].entities).has.length(1);

    let c = await storage.connect();
    let q = await c.manager.query('SELECT * FROM sqlite_master WHERE type=\'table\';');
    expect(q).has.length(1);
  }

  @test
  async 'dynamically add entity class in db file'() {

    class X {
      @PrimaryColumn()
      id: number;
    }

    let dbfile = path.join(__dirname, 'testdb01.sqlite');
    let opts = _.merge(_.clone(TEST_STORAGE_OPTIONS), {database: dbfile});


    let invoker = new Invoker();
    Container.set(Invoker.NAME,invoker);

    let storage = new StorageRef(opts);
    await storage.prepare();

    storage.addEntityClass(X, "xtable");
    await storage.reload();
    expect(storage['options'].entities).has.length(1);

    let c = await storage.connect();
    let q = await c.manager.query('SELECT * FROM sqlite_master WHERE type=\'table\';');
    expect(q).has.length(1);

    if (fs.existsSync(dbfile)) {
      fs.unlinkSync(dbfile);
    }
    await storage.shutdown(true);
  }

  @test
  async 'typeorm detect listener on dynamically added class'() {
    class X {
      @PrimaryColumn()
      id: number;

      @Column()
      txt: string;

      test: boolean = false;

      @BeforeInsert()
      t() {
        this.test = true;
      }
    }

    class Y extends X {
      test2: boolean = false;

      @BeforeInsert()
      tes() {
        this.test2 = true;
      }
    }

    let invoker = new Invoker();
    Container.set(Invoker.NAME,invoker);

    let storage = new StorageRef(TEST_STORAGE_OPTIONS);
    await storage.prepare();

    storage.addEntityClass(X, "xtable");
    storage.addEntityClass(Y, "ytable");
    await storage.reload();

    let c = await storage.connect();
    let repo = c.manager.getRepository("xtable");
    let x = new X();
    x.id = 1;
    x.txt = 'txt';
    x = await repo.save(x);
    expect(x.test).to.be.true;

    repo = c.manager.getRepository("ytable");
    let y = new Y();
    y.id = 1;
    y.txt = 'txt';
    y = await repo.save(y);
    expect(y.test).to.be.true;
    expect(y.test2).to.be.true;
    await storage.shutdown(true);
  }


  @test
  async 'typeorm detect listener on fixed added class'() {
    let opts = _.merge(_.clone(TEST_STORAGE_OPTIONS), {entities: [X1, Y1]});

    let invoker = new Invoker();
    Container.set(Invoker.NAME,invoker);

    let storage = new StorageRef(opts);
    await storage.prepare();

    let c = await storage.connect();
    let repo = c.manager.getRepository(X1);
    let x = new X1();
    x.id = 1;
    x.txt = 'txt';
    x = await repo.save(x);
    expect(x.test).to.be.true;

    repo = c.manager.getRepository(Y1);
    let y = new Y1();
    y.id = 1;
    y.txt = 'txt';
    y = await repo.save(y);
    expect(y.test).to.be.true;
    expect(y.test2).to.be.true;
    await storage.shutdown(true);
  }
}

