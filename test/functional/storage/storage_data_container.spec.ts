import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import {DataContainer, TreeUtils, WalkValues} from "../../../src";
import {TypeOrmEntityRegistry} from "../../../src/libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry";

import * as _ from "lodash";


@suite('functional/storage/storage_data_container')
class Storage_data_containerSpec {

  before(){
  }

  @test
  async 'check empty'() {
    const Person = require('./entities/Person').Person;
    let p = new Person();
    let c = new DataContainer(p, TypeOrmEntityRegistry.$());
    let retCode = await c.validate();
    expect(retCode).to.be.false;
    expect(c.hasErrors()).to.be.true;
    expect(c.errors).to.have.length(3);
    expect(c.isSuccessValidated).to.be.false;
    expect(c.isValidated).to.be.true;
  }


  @test
  async 'half filled'() {
    const Person = require('./entities/Person').Person;
    let p = new Person();
    p.lastName = 'Blacky';
    let c = new DataContainer(p, TypeOrmEntityRegistry.$());
    let retCode = await c.validate();
    expect(retCode).to.be.false;
    expect(c.hasErrors()).to.be.true;
    expect(c.errors).to.have.length(2);
    expect(c.isSuccessValidated).to.be.false;
    expect(c.isValidated).to.be.true;
  }


  @test
  async 'full filled'() {
    const Person = require('./entities/Person').Person;
    let p = new Person();
    p.firstName = 'Funny';
    p.lastName = 'Blacky';
    p.eMail = 'world@warcraft.tv';
    let c = new DataContainer(p, TypeOrmEntityRegistry.$());
    let retCode = await c.validate();
    expect(retCode).to.be.true;
    expect(c.hasErrors()).to.be.false;
    expect(c.errors).to.have.length(0);
    expect(c.isSuccessValidated).to.be.true;
    expect(c.isValidated).to.be.true;
  }


  @test
  async 'dummy full filled'() {
    let regEntityDef = TypeOrmEntityRegistry.$().getEntityRefFor('Person');
    let data = regEntityDef.toJson();
    let data_x = JSON.parse(JSON.stringify(data));

    TreeUtils.walk(data_x, (v: WalkValues) => {
      if (v.value == 'Person') {
        v.parent[v.key] = 'Person2';
      } else if (_.isString(v.value) && /person/.test(v.value)) {
        v.parent[v.key] = v.value.replace('person', 'person_2');
      } else if (_.isFunction(v.value)) {
      }
    });
    data_x.machineName = 'person_2';

    let entityDef2 = TypeOrmEntityRegistry.$().fromJson(data_x);

    let p:any = entityDef2.create();
    p.firstName = 'Funny';
    p.lastName = 'Blacky';
    p.eMail = 'world@warcraft.tv';

    let c = new DataContainer(p, TypeOrmEntityRegistry.$());
    let retCode = await c.validate();
    expect(retCode).to.be.true;
    expect(c.hasErrors()).to.be.false;
    expect(c.errors).to.have.length(0);
    expect(c.isSuccessValidated).to.be.true;
    expect(c.isValidated).to.be.true;
  }

}

