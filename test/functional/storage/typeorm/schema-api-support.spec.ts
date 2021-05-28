import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {Invoker} from '../../../../src/base/Invoker';
import {IStorageOptions} from '../../../../src/libs/storage/IStorageOptions';
import {Bootstrap} from '../../../../src/Bootstrap';
import {BeforeInsert, Column, PrimaryColumn} from 'typeorm';
import {X1} from './../entities/X1';
import {Y1} from './../entities/Y1';
import {TEST_STORAGE_OPTIONS} from '../../config';
import {Entity, MetadataRegistry, Property, RegistryFactory} from '@allgemein/schema-api';
import {TypeOrmStorageRef} from '../../../../src/libs/storage/framework/typeorm/TypeOrmStorageRef';
import {BaseConnectionOptions} from 'typeorm/connection/BaseConnectionOptions';
import {Injector} from '../../../../src/libs/di/Injector';
import {REGISTRY_TYPEORM} from '../../../../src/libs/storage/framework/typeorm/Constants';
import {TypeOrmEntityRegistry} from '../../../../src/libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry';

let registry: TypeOrmEntityRegistry = null;
// tslint:disable-next-line:prefer-const
let bootstrap: Bootstrap = null;
let EntityOfSchemaApi: Function = null;

let storageOptions:IStorageOptions & BaseConnectionOptions = null;

@suite('functional/storage/typeorm/schema-api-support')
class SchemaApiSupportSpec {

  static before() {
    MetadataRegistry.$().removeAllListeners();
    RegistryFactory.register(REGISTRY_TYPEORM, TypeOrmEntityRegistry);
    RegistryFactory.register(/^typeorm\..*/, TypeOrmEntityRegistry);
  }


  async before() {
    Bootstrap.reset();
    registry = RegistryFactory.get(REGISTRY_TYPEORM) as TypeOrmEntityRegistry;
    await import('./data/schema-api/entities/EntityOfSchemaApi').then(x => {
      EntityOfSchemaApi = x.EntityOfSchemaApi;
    });
    storageOptions = _.cloneDeep(TEST_STORAGE_OPTIONS) as IStorageOptions & BaseConnectionOptions;
  }


  async after() {
    if (bootstrap) {
      await bootstrap.shutdown();
    }
    if (registry) {
      registry.reset();
    }
    RegistryFactory.remove(REGISTRY_TYPEORM);
  }

  @test
  async 'register created simple entity declared by schema api'() {

    const entityRef = registry.getEntityRefFor(EntityOfSchemaApi);
    expect(entityRef.getNamespace()).to.be.eq(REGISTRY_TYPEORM);
    expect(entityRef.name).to.be.eq('EntityOfSchemaApi');
    const properties = entityRef.getPropertyRefs();
    expect(properties).to.have.length(3);
    expect(properties.map(x => x.name)).to.be.deep.eq(['id', 'strValue', 'nrValue']);
    const idProp = properties.find(x => x.name === 'id');
    expect(idProp.isIdentifier()).to.be.true;
    expect(idProp.getType()).to.be.eq('number');
    expect(idProp.getOptions()).to.be.deep.eq({
      'identifier': true,
      'metaType': 'property',
      'metadata': {
        'mode': 'regular',
        'options': {
          'name': 'id',
          'primary': true,
          'type': Number,
        },
        'propertyName': 'id',
        target: entityRef.getClass()
      },
      'name': 'id',
      target: entityRef.getClass(),
      'namespace': 'typeorm',
      'propertyName': 'id',
      'tableType': 'column',
      'type': 'number'
    });
  }

  @test.skip
  async 'register created entity declared by schema api with relation to other entity (E-P-E)'() {

  }

  @test.skip
  async 'register created entity declared by schema api with relations to other entity (E-P-E[])'() {

  }

  @test.skip
  async 'register created entity declared by schema api with relation to other objects (E-P-O)'() {

  }

  @test.skip
  async 'register created entity declared by schema api with relations to other objects (E-P-O[])'() {

  }


  @test
  async 'dynamically add annotated entity class to memory db'() {
    const invoker = new Invoker();
    Injector.set(Invoker.NAME, invoker);

    const storage = new TypeOrmStorageRef(storageOptions);
    await storage.prepare();

    // add annotated class
    storage.addEntityType(EntityOfSchemaApi);
    // storage.addTableEntityClass(EntityOfSchemaApi, 'schema_api_table');
    await storage.reload();
    expect(storage.getDeclaredEntities()).has.length(1);

    const c = await storage.connect();
    const q = await c.manager.query('SELECT * FROM sqlite_master WHERE type = \'table\' ;');
    await storage.shutdown(true);

    expect(q).has.length(1);
    expect(q[0].sql).to.be.eq(
      'CREATE TABLE "entity_of_schema_api" ("id" integer PRIMARY KEY NOT NULL, "str_value" varchar NOT NULL, "nr_value" integer NOT NULL)'
    );
  }


  @test
  async 'dynamically add entity class to memory db'() {

    @Entity({namespace: 'typeorm'})
    class EntityOfSchemaApi2 {

      @Property({identifier: true})
      idNr: number;

      @Property()
      strValue: string;

      @Property()
      nrValue: number;

    }

    const invoker = new Invoker();
    Injector.set(Invoker.NAME, invoker);

    const storage = new TypeOrmStorageRef(storageOptions);
    await storage.prepare();

    // add annotated class
    // TODO correct? adding addition table with same name?
    storage.addTableEntityClass(EntityOfSchemaApi2, 'schema_api_table');
    await storage.reload();
    expect(storage.getDeclaredEntities().map(x => x.name)).to.include.members(['EntityOfSchemaApi2']);

    const c = await storage.connect();
    const q = await c.manager.query('SELECT * FROM sqlite_master WHERE type = \'table\' and name NOT LIKE \'sqlite%\';');
    await storage.shutdown(true);

    expect(q).has.length(2);
    expect(q.map((x: any) => x.sql)).to.be.deep.eq(
      [
        'CREATE TABLE "entity_of_schema_api2" ("id_nr" integer PRIMARY KEY NOT NULL, "str_value" varchar NOT NULL, "nr_value" integer NOT NULL)',
        'CREATE TABLE "schema_api_table" ("id_nr" integer PRIMARY KEY NOT NULL, "str_value" varchar NOT NULL, "nr_value" integer NOT NULL)'
      ]
    );

  }

  @test
  async 'dynamically add annotated entity class to file db '() {
    const dbfile = path.join(os.tmpdir(), 'testdb-schema-api.sqlite');
    const opts = _.merge(_.clone(storageOptions), {database: dbfile});

    const invoker = new Invoker();
    Injector.set(Invoker.NAME, invoker);

    const storage = new TypeOrmStorageRef(opts as any);
    await storage.prepare();

    storage.addEntityClass(EntityOfSchemaApi);
    await storage.reload();
    expect(storage.getDeclaredEntities().map(x => x.name)).to.include.members(['EntityOfSchemaApi']);

    const c = await storage.connect();
    const q = await c.manager.query('SELECT * FROM sqlite_master WHERE type=\'table\';');

    if (fs.existsSync(dbfile)) {
      fs.unlinkSync(dbfile);
    }
    await storage.shutdown(true);

    expect(q).has.length(1);
    expect(q[0].sql).to.be.eq(
      'CREATE TABLE "entity_of_schema_api" ' +
      '("id" integer PRIMARY KEY NOT NULL, "str_value" varchar NOT NULL, "nr_value" integer NOT NULL)'
    );
  }

  @test
  async 'typeorm detect listener on dynamically added class'() {
    class X {
      @PrimaryColumn()
      id: number;

      @Column()
      txt: string;

      test = false;

      @BeforeInsert()
      t() {
        this.test = true;
      }
    }

    class Y extends X {
      test2 = false;

      @BeforeInsert()
      tes() {
        this.test2 = true;
      }
    }

    const invoker = new Invoker();
    Injector.set(Invoker.NAME, invoker);

    const storage = new TypeOrmStorageRef(storageOptions);
    await storage.prepare();

    storage.addTableEntityClass(X, 'xtable');
    storage.addTableEntityClass(Y, 'ytable');
    await storage.reload();

    const c = await storage.connect();
    let repo = c.manager.getRepository('xtable');
    let x = new X();
    x.id = 1;
    x.txt = 'txt';
    x = await repo.save(x);
    expect(x.test).to.be.true;

    repo = c.manager.getRepository('ytable');
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
    const opts = _.merge(_.clone(storageOptions), {entities: [X1, Y1]});

    const invoker = new Invoker();
    Injector.set(Invoker.NAME, invoker);

    const storage = new TypeOrmStorageRef(opts as any);
    await storage.prepare();

    const c = await storage.connect();
    const repo = c.manager.getRepository(X1);
    let x = new X1();
    x.id = 1;
    x.txt = 'txt';
    x = await repo.save(x);
    expect(x.test).to.be.true;

    const repo2 = c.manager.getRepository(Y1);
    let y = new Y1();
    y.id = 1;
    y.txt = 'txt';
    y = await repo2.save(y);
    expect(y.test).to.be.true;
    expect(y.test2).to.be.true;
    await storage.shutdown(true);
  }
}

