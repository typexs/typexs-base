import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';
import {TypeOrmEntityRegistry} from '../../../src/libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry';

import * as _ from 'lodash';
import {TreeUtils, WalkValues} from 'commons-base';
import {DataContainer} from '../../../src/libs/storage/DataContainer';


@suite('functional/storage/storage_data_container')
class StorageDataContainerSpec {

  before() {
  }

  @test
  async 'check empty'() {
    const Person = require('./entities/Person').Person;
    const p = new Person();
    const c = new DataContainer(p, TypeOrmEntityRegistry.$());
    const retCode = await c.validate();
    expect(retCode).to.be.false;
    expect(c.hasErrors()).to.be.true;
    expect(c.errors).to.have.length(3);
    expect(c.isSuccessValidated).to.be.false;
    expect(c.isValidated).to.be.true;
  }


  @test
  async 'half filled'() {
    const Person = require('./entities/Person').Person;
    const p = new Person();
    p.lastName = 'Blacky';
    const c = new DataContainer(p, TypeOrmEntityRegistry.$());
    const retCode = await c.validate();
    expect(retCode).to.be.false;
    expect(c.hasErrors()).to.be.true;
    expect(c.errors).to.have.length(2);
    expect(c.isSuccessValidated).to.be.false;
    expect(c.isValidated).to.be.true;
  }


  @test
  async 'full filled'() {
    const Person = require('./entities/Person').Person;
    const p = new Person();
    p.firstName = 'Funny';
    p.lastName = 'Blacky';
    p.eMail = 'world@warcraft.tv';
    const c = new DataContainer(p, TypeOrmEntityRegistry.$());
    const retCode = await c.validate();
    expect(retCode).to.be.true;
    expect(c.hasErrors()).to.be.false;
    expect(c.errors).to.have.length(0);
    expect(c.isSuccessValidated).to.be.true;
    expect(c.isValidated).to.be.true;
  }


  @test
  async 'dummy full filled'() {
    const regEntityDef = TypeOrmEntityRegistry.$().getEntityRefFor('Person');
    const data = regEntityDef.toJson();
    const data_x = JSON.parse(JSON.stringify(data));

    TreeUtils.walk(data_x, (v: WalkValues) => {
      if (v.value === 'Person') {
        v.parent[v.key] = 'Person2';
      } else if (_.isString(v.value) && /person/.test(v.value)) {
        v.parent[v.key] = v.value.replace('person', 'person_2');
      } else if (_.isFunction(v.value)) {
      }
    });
    data_x.machineName = 'person_2';

    const entityDef2 = TypeOrmEntityRegistry.$().fromJson(data_x);

    const p: any = entityDef2.create();
    p.firstName = 'Funny';
    p.lastName = 'Blacky';
    p.eMail = 'world@warcraft.tv';

    const c = new DataContainer(p, TypeOrmEntityRegistry.$());
    const retCode = await c.validate();
    expect(retCode).to.be.true;
    expect(c.hasErrors()).to.be.false;
    expect(c.errors).to.have.length(0);
    expect(c.isSuccessValidated).to.be.true;
    expect(c.isValidated).to.be.true;
  }

}

