import 'reflect-metadata';
import {expect} from 'chai';
import * as path from 'path';
import {suite, test} from 'mocha-typescript';
import {Bootstrap} from '../../../src/Bootstrap';
import {Config} from 'commons-config';
import {C_DEFAULT} from 'commons-base';
import {SchemaUtils} from 'commons-schema-api';
import {Column, Entity, getMetadataArgsStorage, PrimaryGeneratedColumn} from 'typeorm';
import {TypeOrmConnectionWrapper} from '../../../src/libs/storage/framework/typeorm/TypeOrmConnectionWrapper';

let bootstrap: Bootstrap;


@suite('functional/storage/add_entity_on_runtime')
class StorageAddEntityOnRuntimeSpec {


  static async before() {
    // TestHelper.typeOrmReset();
    Bootstrap.reset();
    Config.clear();
    const appdir = path.join(__dirname, 'fake_app');
    bootstrap = Bootstrap
      .setConfigSources([{type: 'system'}])
      .configure({
        app: {
          path: appdir
        },
        modules: {
          paths: [__dirname + '/../../..']
        },
        storage: {
          default: {
            synchronize: true,
            type: 'sqlite',
            database: ':memory:'
          } as any
        }
      });

    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();
  }


  static async after() {
    if (bootstrap) {
      await bootstrap.shutdown();
    }
  }


  @test
  async 'dynamically add entity'() {
    const metadataArgsStorage = getMetadataArgsStorage();
    const storageManager = bootstrap.getStorage();
    const storageRef = storageManager.get(C_DEFAULT);

    let entityNames = storageRef.getEntityNames();
    entityNames.sort();
    expect(entityNames).to.be.deep.eq([
      'ModuleEntity',
      'SystemNodeInfo',
      'TaskLog',
      'TestEntity'
    ]);

    const clazz = SchemaUtils.clazz('TestClass');

    let connection = await storageRef.connect() as TypeOrmConnectionWrapper;
    // open new connection
    let enttityMetadata = connection._connection.entityMetadatas;
    expect(enttityMetadata).to.have.length(4);

    Entity({name: 'test_class'})(clazz);
    PrimaryGeneratedColumn({type: 'int'})({constructor: clazz}, 'id');
    Column({type: 'varchar', length: 16})({constructor: clazz}, 'name');
    storageRef.addEntityClass(clazz);

    // now add new entity
    entityNames = storageRef.getEntityNames();
    entityNames.sort();
    expect(entityNames).to.be.deep.eq([
      'ModuleEntity',
      'SystemNodeInfo',
      'TaskLog',
      'TestClass',
      'TestEntity'
    ]);

    // connection will be reseted
    expect(connection._connection).to.be.null;

    // check if it can be queried
    let results = await connection.manager.getRepository('SystemNodeInfo').find();

    // check if old data is present (no in inmemory db)
    let error = null;
    try {
      results = await connection.manager.getRepository('TestClass').find();

    } catch (e) {
      error = e;

    }

    expect(error).to.not.be.null;

    await connection.close();
    connection = await storageRef.connect() as TypeOrmConnectionWrapper;

    enttityMetadata = connection._connection.entityMetadatas;
    expect(enttityMetadata).to.have.length(5);
    expect(enttityMetadata.map(x => x.name)).to.contain('TestClass');

    // check if it can be queried
    results = await connection.manager.getRepository('SystemNodeInfo').find();

    // check if old data is present (no in inmemory db)
    results = await connection.manager.getRepository('TestClass').find();


    await connection.close();
  }
}
