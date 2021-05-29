import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import {TypeOrmEntityRegistry} from '../../../src/libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry';
import {DataContainer, IEntityRef, IJsonSchema, ILookupRegistry, RegistryFactory} from '@allgemein/schema-api';
import {REGISTRY_TYPEORM} from '../../../src/libs/storage/framework/typeorm/Constants';

let Person: any;
let PersonWithRequired: any = null;
let registry: ILookupRegistry & IJsonSchema;

@suite('functional/storage/storage_data_container')
class StorageDataContainerSpec {

  static before() {
    RegistryFactory.remove(REGISTRY_TYPEORM);
    RegistryFactory.register(REGISTRY_TYPEORM, TypeOrmEntityRegistry);
    RegistryFactory.register(/^typeorm\..*/, TypeOrmEntityRegistry);
    registry = RegistryFactory.get(REGISTRY_TYPEORM);

    Person = require('./entities/Person').Person;
    PersonWithRequired = require('./entities/Person').PersonWithRequired;
  }

  @test
  async 'check empty object without required values faling'() {
    const p = new Person();
    const c = new DataContainer(p, registry);
    const retCode = await c.validate();
    expect(retCode).to.be.false;
    expect(c.hasErrors()).to.be.true;
    expect(c.errors).to.have.length(3);
    expect(c.isSuccessValidated).to.be.false;
    expect(c.isValidated).to.be.true;
  }

  @test
  async 'check empty object with required values failing'() {
    const p = new PersonWithRequired();
    const c = new DataContainer(p, registry);
    const retCode = await c.validate();
    expect(retCode).to.be.false;
    expect(c.hasErrors()).to.be.true;
    expect(c.errors).to.have.length(6);
    expect(c.isSuccessValidated).to.be.false;
    expect(c.isValidated).to.be.true;
  }

  @test
  async 'half filled object rest filled with empty value'() {
    const p = new Person();
    p.lastName = 'Blacky';
    p.eMail = '';
    p.firstName = '';
    const c = new DataContainer(p, registry);
    const retCode = await c.validate();
    expect(retCode).to.be.false;
    expect(c.hasErrors()).to.be.true;
    expect(c.errors).to.have.length(2);
    expect(c.isSuccessValidated).to.be.false;
    expect(c.isValidated).to.be.true;
  }


  @test
  async 'full filled passing'() {
    const p = new Person();
    p.firstName = 'Funny';
    p.lastName = 'Blacky';
    p.eMail = 'world@warcraft.tv';
    const c = new DataContainer(p, registry);
    const retCode = await c.validate();
    expect(retCode).to.be.true;
    expect(c.hasErrors()).to.be.false;
    expect(c.errors).to.have.length(0);
    expect(c.isSuccessValidated).to.be.true;
    expect(c.isValidated).to.be.true;
  }

  @test
  async 'full filled failing'() {

    const p = new Person();
    p.firstName = 'Fny';
    p.lastName = 'Bky';
    p.eMail = 'worldwarcrat.tv';
    const c = new DataContainer(p, registry);
    const retCode = await c.validate();
    expect(retCode).to.be.false;
    expect(c.hasErrors()).to.be.true;
    expect(c.errors).to.have.length(3);
    expect(c.isSuccessValidated).to.be.false;
    expect(c.isValidated).to.be.true;
  }


  @test
  async 'create class dynamically form json and instance new container'() {
    const json = {
      '$schema': 'http://json-schema.org/draft-07/schema#',
      'definitions': {
        'Person3': {
          'title': 'Person3',
          'type': 'object',
          'metadata': {
            'type': 'regular'
          },
          'properties': {
            'id': {
              'type': 'Number',
              'metadata': {
                'propertyName': 'id',
                'mode': 'regular',
                'options': {
                  'primary': true
                }
              },
              'tableType': 'column'
            },
            'firstName': {
              'type': 'String',
              'metadata': {
                'propertyName': 'firstName',
                'mode': 'regular',
                'options': {}
              },
              'tableType': 'column'
            },
            'lastName': {
              'type': 'String',
              'metadata': {
                'propertyName': 'lastName',
                'mode': 'regular',
                'options': {}
              },
              'tableType': 'column'
            },
            'eMail': {
              'type': 'String',
              'metadata': {
                'propertyName': 'eMail',
                'mode': 'regular',
                'options': {}
              },
              'tableType': 'column'
            }
          }
        }
      },
      '$ref': '#/definitions/Person3'
    };

    const entityDef2 = await registry.fromJsonSchema(json) as IEntityRef;

    const p: any = entityDef2.create();
    p.firstName = 'Funny';
    p.lastName = 'Blacky';
    p.eMail = 'world@warcraft.tv';

    const c = new DataContainer(p, registry);
    const retCode = await c.validate();
    expect(retCode).to.be.true;
    expect(c.hasErrors()).to.be.false;
    expect(c.errors).to.have.length(0);
    expect(c.isSuccessValidated).to.be.true;
    expect(c.isValidated).to.be.true;
  }

}

