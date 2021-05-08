import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import * as _ from 'lodash';
import {Driver} from './entities/Driver';
import {Car} from './entities/Car';
import {Truth} from './entities/Truth';
import {__CLASS__, RegistryFactory} from '@allgemein/schema-api';
import {TypeOrmEntityRegistry} from '../../../../src/libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry';
import {__REGISTRY__} from '../../../../src/libs/Constants';
import {REGISTRY_TYPEORM} from '../../../../src/libs/storage/framework/typeorm/Constants';


@suite('functional/storage/typeorm/entity_transformations')
class EntityTransformationsSpec {

  static before() {
    RegistryFactory.register(REGISTRY_TYPEORM, TypeOrmEntityRegistry);
    RegistryFactory.register(/^typeorm\..*/, TypeOrmEntityRegistry);
  }


  @test
  async 'simple transformations'() {
    const registry = TypeOrmEntityRegistry.$();
    const data = {id: 1, lastName: 'Engels', firstName: 'Friedrich'};
    const entityDef = registry.getEntityRefFor(Driver);
    const author = entityDef.build(data);
    expect(author).to.be.instanceOf(Driver);
    expect(author).to.deep.eq(_.assign(_.clone(data), {[__CLASS__]: 'Driver', [__REGISTRY__]: 'typeorm'}));

    const author2 = entityDef.build(data, {skipClassNamespaceInfo: true});
    expect(author2).to.be.instanceOf(Driver);
    expect(author2).to.deep.eq(_.assign(_.clone(data)));
  }


  @test
  async 'array transformations'() {
    const p = new Car();
    p.id = 1;
    p.name = 'permission;)';
    p.driver = [new Driver(), new Driver()];
    p.driver[0].id = 1;
    p.driver[0].firstName = 'test';
    p.driver[0].lastName = 'test2';
    p.driver[1].id = 2;
    p.driver[1].firstName = 'test2';
    p.driver[1].lastName = 'test3';

    const registry = TypeOrmEntityRegistry.$();
    const entityDef = registry.getEntityRefFor(Car);
    const permission: any = entityDef.build(p);
    expect(_.isArray(permission.driver)).to.be.true;
    expect(permission.driver).to.have.length(2);
  }

  @test
  async 'boolean transformations'() {
    let p = new Truth();
    p.id = 1;
    p.isTrue = false;

    const registry = TypeOrmEntityRegistry.$();
    const entityDef = registry.getEntityRefFor('Truth');
    let permission: any = entityDef.build(p);
    expect(_.isBoolean(permission.isTrue)).to.be.true;
    expect(permission.isTrue).to.be.false;


    p = new Truth();
    p.id = 1;
    p.isTrue = true;

    permission = entityDef.build(p);
    expect(_.isBoolean(permission.isTrue)).to.be.true;
    expect(permission.isTrue).to.be.true;

  }


  // @test
  // async 'entity with object integration'() {
  //   let EntityWithEmbedded = require('./schemas/embedded/EntityWithEmbedded').EntityWithEmbedded;
  //   let EmbeddedSubObject = require('./schemas/embedded/EmbeddedSubObject').EmbeddedSubObject;
  //   let EmbeddedObject = require('./schemas/embedded/EmbeddedObject').EmbeddedObject;
  //
  //   let p = new EntityWithEmbedded();
  //   p.id = 2;
  //   p.obj = new EmbeddedObject();
  //   p.obj.inner = new EmbeddedSubObject();
  //   p.obj.innerName = 'test';
  //   p.obj.inner.subName = 'test2';
  //   p.obj.inner.SubOtherVar = 1;
  //
  //
  //   let registry = TypeOrmEntityRegistry.$();
  //   let entityDef = registry.getEntityDefByName('EntityWithEmbedded');
  //   let entityWithEmbedded: any = entityDef.build(JSON.parse(JSON.stringify(p)));
  //   expect(entityWithEmbedded).to.deep.eq(p);
  //
  // }
  //
  // @test
  // async 'entity with multiple object integration'() {
  //   let Car = require('./schemas/direct_property/Car').Car;
  //   let Driver = require('./schemas/direct_property/Driver').Driver;
  //   let Skil = require('./schemas/direct_property/Skil').Skil;
  //
  //   let p = new Car();
  //   p.id = 1;
  //   p.producer = 'Volvo';
  //   p.drivers = [new Driver(),new Driver()];
  //   p.drivers[0].age = 18;
  //   p.drivers[0].nickName = 'Bert';
  //   p.drivers[0].skill = new Skil();
  //   p.drivers[1].age = 21;
  //   p.drivers[1].nickName = 'Runny';
  //   p.drivers[1].skill = new Skil();
  //
  //
  //
  //   let registry = EntityRegistry.$();
  //   let entityDef = registry.getEntityDefByName('Car');
  //   let entityWithEmbedded: any = entityDef.build(JSON.parse(JSON.stringify(p)));
  //   expect(entityWithEmbedded).to.deep.eq(p);
  //   console.log(entityWithEmbedded)
  //
  // }

}

