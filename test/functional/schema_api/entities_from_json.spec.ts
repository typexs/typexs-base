import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import * as _ from 'lodash';
import {TypeOrmEntityRegistry} from '../../../src/libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry';
import {Car} from './entities/Car';
import {REGISTRY_TYPEORM, TypeOrmEntityRef} from '../../../src';
import {RegistryFactory} from '@allgemein/schema-api';
import {inspect} from 'util';


@suite('functional/entity_from_json')
class EntitiesFromJsonSpec {

  static before() {
    RegistryFactory.register(REGISTRY_TYPEORM, TypeOrmEntityRegistry);
    RegistryFactory.register(/^typeorm\..*/, TypeOrmEntityRegistry);
  }


  after() {
    RegistryFactory.remove(REGISTRY_TYPEORM);
  }

  @test
  async 'register entity by json'() {
    const registry = RegistryFactory.get(REGISTRY_TYPEORM) as TypeOrmEntityRegistry;
    const regEntityDef = registry.getEntityRefFor(Car);
    expect(regEntityDef.getPropertyRefs()).to.have.length(3);
    const data = regEntityDef.toJsonSchema();
    const data_x = JSON.parse(JSON.stringify(data));
    expect(data_x).to.deep.eq({
      '$schema': 'http://json-schema.org/draft-07/schema#',
      definitions: {
        Car: {
          title: 'Car',
          type: 'object',
          metadata: { type: 'regular' },
          properties: {
            id: {
              type: 'number',
              metadata: {
                propertyName: 'id',
                mode: 'regular',
                options: { primary: true }
              },
              tableType: 'column'
            },
            name: {
              type: 'string',
              metadata: { propertyName: 'name', mode: 'regular', options: {} },
              tableType: 'column'
            },
            driver: {
              type: 'array',
              items: { '$ref': '#/definitions/Driver' },
              metadata: {
                propertyName: 'driver',
                isLazy: false,
                relationType: 'one-to-many',
                options: {}
              },
              tableType: 'relation'
            }
          }
        },
        Driver: {
          title: 'Driver',
          type: 'object',
          metadata: { type: 'regular' },
          properties: {
            id: {
              type: 'number',
              metadata: {
                propertyName: 'id',
                mode: 'regular',
                options: { primary: true }
              },
              tableType: 'column'
            },
            firstName: {
              type: 'string',
              metadata: { propertyName: 'firstName', mode: 'regular', options: {} },
              tableType: 'column'
            },
            lastName: {
              type: 'string',
              metadata: { propertyName: 'lastName', mode: 'regular', options: {} },
              tableType: 'column'
            },
            car: {
              type: 'object',
              '$ref': '#/definitions/Car',
              metadata: {
                propertyName: 'car',
                relationType: 'many-to-one',
                isLazy: false,
                options: {}
              },
              tableType: 'relation'
            }
          }
        }
      },
      '$ref': '#/definitions/Car'
    });
    // TreeUtils.walk(data_x, (v: WalkValues) => {
    //   if (v.value === 'Car') {
    //     v.parent[v.key] = 'Car2';
    //   } else if (_.isString(v.value) && /car/.test(v.value)) {
    //     v.parent[v.key] = v.value.replace('car', 'car2');
    //   } else if (_.isFunction(v.value)) {
    //   }
    // });
    // data_x.machineName = 'car_2';

    data_x.definitions['Car2'] = _.cloneDeep(data_x.definitions['Car']);
    data_x.definitions['Car2'].title = 'Car2';
    // delete data_x.definitions['Car'];
    data_x.$ref = '#/definitions/Car2';

    const entityDef2 = await registry.fromJsonSchema(_.cloneDeep(data_x)) as TypeOrmEntityRef;
    expect(entityDef2.getPropertyRefs()).to.have.length(3);
    let data2 = entityDef2.toJsonSchema();
    data2 = JSON.parse(JSON.stringify(data2));
    expect(data2).to.deep.eq(data_x);
  }

  // @test
  // async 'register entity by json 2'() {
  //   const registry = new TypeOrmEntityRegistry();
  //   const regEntityDef = registry.getEntityRefFor(Car);
  //   expect(regEntityDef.getPropertyRefs()).to.have.length(3);
  //   const data = regEntityDef.toJsonSchema();
  //   const data_x = JSON.parse(JSON.stringify(data));
  //
  //   TreeUtils.walk(data_x, (v: WalkValues) => {
  //     if (v.value === 'Car') {
  //       v.parent[v.key] = 'Car2';
  //     } else if (_.isString(v.value) && /car/.test(v.value)) {
  //       v.parent[v.key] = v.value.replace('car', 'car2');
  //     } else if (_.isFunction(v.value)) {
  //     }
  //   });
  //   data_x.machineName = 'car_2';
  //
  //
  //   const entityDef2 = await registry.fromJsonSchema(data_x) as TypeOrmEntityRef;
  //   expect(entityDef2.getPropertyRefs()).to.have.length(3);
  //   let data2 = entityDef2.toJsonSchema();
  //   data2 = JSON.parse(JSON.stringify(data2));
  //   expect(data2).to.deep.eq(data_x);
  //
  // }

}

