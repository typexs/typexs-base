import * as _ from 'lodash';
import {expect} from 'chai';
import {suite, test} from 'mocha-typescript';
import {TypeOrmEntityRegistry} from '../../../../src/libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry';
import {House} from './entities/House';
import {Column, Entity, getMetadataArgsStorage} from 'typeorm';
import {SchemaUtils} from 'commons-schema-api';

let registry: TypeOrmEntityRegistry = null;

@suite('functional/storage/typeorm/registry')
class StorageTypeormRegistrySpec {


  before() {
    registry = new TypeOrmEntityRegistry();
  }

  after() {
    if (registry) {
      registry = null;
      TypeOrmEntityRegistry.reset();
    }
  }

  @test
  async 'register imported'() {
    const metadata = getMetadataArgsStorage();
    const entityRef = registry.getEntityRefFor(House);
    const properties = entityRef.getPropertyRefs();

    const targets = metadata.tables.filter(x => _.get(x, 'target.name', null) === 'House');
    const columns = metadata.columns.filter(x => _.get(x, 'target.name', null) === 'House');

    expect(entityRef).to.not.be.null;
    expect(targets).to.have.length(1);
    expect(properties).to.have.length(3);
    expect(columns).to.have.length(3);

  }


  @test
  async 'register on the fly import'() {
    const metadata = getMetadataArgsStorage();
    const onTheFly = require('./entities/HouseOnTheFly').HouseOnTheFly;
    const entityRefImported = registry.getEntityRefFor(House);
    const entityRef = registry.getEntityRefFor(onTheFly);
    const entities = registry.listEntities();
    const properties = registry.listProperties();


    const targets = metadata.tables.filter(x => _.get(x, 'target.name', '').startsWith('House'));
    const columns = metadata.columns.filter(x => _.get(x, 'target.name', '').startsWith('House'));

    expect(entityRef).to.not.be.null;
    expect(targets).to.have.length(2);
    expect(entities).to.have.length(2);
    expect(columns).to.have.length(6);
    expect(properties).to.have.length(6);

  }

  @test
  async 'register dynamically created entity'() {
    const metadata = getMetadataArgsStorage();

    let targets = metadata.tables.filter(x => _.get(x, 'target.name', '').startsWith('HouseOf'));
    expect(targets).to.have.length(0);
    const clazz = SchemaUtils.clazz('HouseOfDance');
    Entity()(clazz);

    targets = metadata.tables.filter(x => _.get(x, 'target.name', '').startsWith('HouseOf'));
    expect(targets).to.have.length(1);
    let entities = registry.listEntities();
    expect(entities).to.have.length(0);
    const entityRef = registry.getEntityRefFor(clazz);

    entities = registry.listEntities();
    expect(entities).to.have.length(1);

    let properties = registry.listProperties();
    expect(properties).to.have.length(0);
    let columns = metadata.columns.filter(x => _.get(x, 'target.name', '').startsWith('HouseOf'));
    expect(columns).to.have.length(0);
    Column({type: 'string'})({constructor: clazz}, 'greatColumn');

    properties = registry.listProperties();
    expect(properties).to.have.length(1);

    columns = metadata.columns.filter(x => _.get(x, 'target.name', '').startsWith('HouseOf'));
    expect(columns).to.have.length(1);

    // const columns = metadata.columns.filter(x => _.get(x, 'target.name', '').startsWith('House'));
    //
    // expect(targets).to.have.length(2);
    // expect(entities).to.have.length(2);
    // expect(columns).to.have.length(6);
    // expect(properties).to.have.length(6);
  }

}

