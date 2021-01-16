import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';
import * as _ from 'lodash';
import {TypeOrmEntityRegistry} from '../../../src/libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry';
import {Car} from './entities/Car';
import {TreeUtils, WalkValues} from '@allgemein/base';


@suite('functional/entity_from_json')
class EntitiesFromJsonSpec {


  @test
  async 'register entity by json'() {
    const registry = new TypeOrmEntityRegistry();
    const regEntityDef = registry.getEntityRefFor(Car);
    expect(regEntityDef.getPropertyRefs()).to.have.length(3);
    const data = regEntityDef.toJson();
    const data_x = JSON.parse(JSON.stringify(data));

    TreeUtils.walk(data_x, (v: WalkValues) => {
      if (v.value === 'Car') {
        v.parent[v.key] = 'Car2';
      } else if (_.isString(v.value) && /car/.test(v.value)) {
        v.parent[v.key] = v.value.replace('car', 'car2');
      } else if (_.isFunction(v.value)) {
      }
    });
    data_x.machineName = 'car_2';


    const entityDef2 = registry.fromJson(data_x);
    expect(entityDef2.getPropertyRefs()).to.have.length(3);
    let data2 = entityDef2.toJson();
    data2 = JSON.parse(JSON.stringify(data2));
    expect(data2).to.deep.eq(data_x);

  }

  @test
  async 'register entity by json 2'() {
    const registry = new TypeOrmEntityRegistry();
    const regEntityDef = registry.getEntityRefFor(Car);
    expect(regEntityDef.getPropertyRefs()).to.have.length(3);
    const data = regEntityDef.toJson();
    const data_x = JSON.parse(JSON.stringify(data));

    TreeUtils.walk(data_x, (v: WalkValues) => {
      if (v.value === 'Car') {
        v.parent[v.key] = 'Car2';
      } else if (_.isString(v.value) && /car/.test(v.value)) {
        v.parent[v.key] = v.value.replace('car', 'car2');
      } else if (_.isFunction(v.value)) {
      }
    });
    data_x.machineName = 'car_2';


    const entityDef2 = registry.fromJson(data_x);
    expect(entityDef2.getPropertyRefs()).to.have.length(3);
    let data2 = entityDef2.toJson();
    data2 = JSON.parse(JSON.stringify(data2));
    expect(data2).to.deep.eq(data_x);

  }

}

