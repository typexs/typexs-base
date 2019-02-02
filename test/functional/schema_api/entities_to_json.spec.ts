import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';

import {Car} from "./entities/Car";
import {TypeOrmEntityRegistry} from "../../../src/libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry";
import {inspect} from "util";


@suite('functional/entities_to_json')
class Entities_to_jsonSpec {


  @test
  async 'with reference'() {
    let registry = TypeOrmEntityRegistry.$();
    let regEntityDef = registry.getEntityRefFor(Car);
    let data = regEntityDef.toJson();

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

