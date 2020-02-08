import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';

import {Car} from './entities/Car';
import {TypeOrmEntityRegistry} from '../../../src/libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry';
import {inspect} from 'util';


@suite('functional/entities_to_json')
class EntitiesToJsonSpec {


  @test
  async 'with reference'() {
    const registry = TypeOrmEntityRegistry.$();
    const regEntityDef = registry.getEntityRefFor(Car);
    const data = regEntityDef.toJson();

    expect(data.properties).to.have.length(3);
    expect(data.properties[2].targetRef).to.deep.eq({
      schema: 'default',
      className: 'Driver',
      isEntity: true,
      options: {}
    });
    /*
    expect(JSON.parse(JSON.stringify(data.properties[1].validator[0]))).to.deep.eq({
      "type": "isDefined",
      "target": "Book",
      "propertyName": "label",
      "validationOptions": {
        "groups": [],
        "always": false,
        "each": false
      }
    });
    */
  }


}

