import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';
import * as _ from "lodash";
import {inspect} from "util";
import {TypeOrmEntityRegistry} from "../../../src/libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry";
import {Car} from "./entities/Car";
import {TreeUtils, WalkValues} from "../../../src";


@suite('functional/entity_from_json')
class Entities_from_jsonSpec {


  @test
  async 'register entity by json'() {
    let registry = TypeOrmEntityRegistry.$();
    let regEntityDef = registry.getEntityRefFor(Car);
    let data = regEntityDef.toJson();
    let data_x = JSON.parse(JSON.stringify(data));

    TreeUtils.walk(data_x, (v: WalkValues) => {
      if (v.value == 'Car') {
        v.parent[v.key] = 'Car2';
      } else if (_.isString(v.value) && /car/.test(v.value)) {
        v.parent[v.key] = v.value.replace('car', 'car2');
      } else if (_.isFunction(v.value)) {
      }
    });
    data_x.machineName = 'car_2';


    let entityDef2 = registry.fromJson(data_x);
    let data2 = entityDef2.toJson();
    data2 = JSON.parse(JSON.stringify(data2));
    expect(data2).to.deep.eq(data_x);

  }


  // @test
  // async   'register entity with references by json'() {
  //   require('./schemas/default/Author')
  //
  //
  //   let d: any = {
  //     id: 'default--bookk',
  //     name: 'Bookk',
  //     type: 'entity',
  //     machineName: 'bookk',
  //     options: {storeable: true},
  //     schema: 'default',
  //     properties:
  //       [{
  //         id: 'default--bookk--id',
  //         name: 'id',
  //         type: 'property',
  //         machineName: 'id',
  //         options:
  //           {
  //             type: 'number',
  //             auto: true,
  //             sourceClass: {},
  //             propertyName: 'id'
  //           },
  //         schema: 'default',
  //         entityName: 'Bookk',
  //         label: 'Id',
  //         dataType: 'number',
  //         generated: true,
  //         identifier: true,
  //         cardinality: 1
  //       },
  //         {
  //           id: 'default--bookk--label',
  //           name: 'label',
  //           type: 'property',
  //           machineName: 'label',
  //           options:
  //             {
  //               type: 'string',
  //               nullable: true,
  //               sourceClass: {},
  //               propertyName: 'label'
  //             },
  //           schema: 'default',
  //           entityName: 'Bookk',
  //           label: 'Label',
  //           dataType: 'string',
  //           generated: false,
  //           identifier: false,
  //           cardinality: 1
  //         },
  //         {
  //           id: 'default--bookk--content',
  //           name: 'content',
  //           type: 'property',
  //           machineName: 'content',
  //           options:
  //             {
  //               type: 'string',
  //               nullable: true,
  //               sourceClass: {},
  //               propertyName: 'content'
  //             },
  //           schema: 'default',
  //           entityName: 'Bookk',
  //           label: 'Content',
  //           dataType: 'string',
  //           generated: false,
  //           identifier: false,
  //           cardinality: 1
  //         },
  //         {
  //           id: 'default--bookk--author',
  //           name: 'author',
  //           type: 'property',
  //           machineName: 'author',
  //           options:
  //             {
  //               nullable: true,
  //               sourceClass: {},
  //               propertyName: 'author'
  //             },
  //           schema: 'default',
  //           entityName: 'Bookk',
  //           label: 'Author',
  //           generated: false,
  //           identifier: false,
  //           cardinality: 1,
  //           targetRef:
  //             {
  //               schema: 'default',
  //               className: 'Author',
  //               isEntity: true,
  //               options: {}
  //             },
  //           embedded: []
  //         }]
  //   };
  //
  //
  //   let registry = TypeOrmEntityRegistry.$();
  //   let entityDef = registry.fromJson(d);
  //   let regEntityDef = registry.getEntityRefFor("Bookk");
  //   expect(entityDef).to.be.eq(regEntityDef);
  //
  //   let authorProp = entityDef.getPropertyDefs().find((p) => p.name == 'author');
  //   expect(authorProp.isReference()).to.be.true;
  //
  //
  // }


}

