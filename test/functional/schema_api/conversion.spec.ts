import {suite, test} from '@testdeck/mocha';
import {TypeOrmEntityRegistry} from '../../../src/libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry';
import {MultipleTypes} from './entities/MultipleTypes';
import {expect} from 'chai';
import {EmbeddedMultipleTypes} from './entities/EmbeddedMultipleTypes';

@suite('functional/conversions')
class ConversionSpec {


  @test
  'check js types on json to object conversion'() {

    const registry = TypeOrmEntityRegistry.$();
    const regEntityDef = registry.getEntityRefFor(MultipleTypes);

    const mt = new MultipleTypes();
    // empty
    const emptyObject = JSON.stringify(mt);
    const recreatedEmpty = regEntityDef.build(JSON.parse(emptyObject));

    // console.log(emptyObject, recreatedEmpty);
    expect(mt).to.deep.eq(recreatedEmpty);
    expect(recreatedEmpty).to.be.instanceOf(MultipleTypes);

    // number
    mt.id = 1;
    mt.number = 12345;
    const numberObject = JSON.stringify(mt);
    const recreatedNumber = regEntityDef.build(JSON.parse(numberObject)) as MultipleTypes;

    // console.log(numberObject, recreatedNumber);
    expect(mt).to.deep.eq(recreatedNumber);
    expect(recreatedNumber).to.be.instanceOf(MultipleTypes);
    expect(recreatedNumber.number).to.be.eq(mt.number);

    // boolean
    mt.boolean = true;
    const booleanObject = JSON.stringify(mt);
    const recreatedBoolean = regEntityDef.build(JSON.parse(booleanObject)) as MultipleTypes;

    // console.log(booleanObject, recreatedBoolean);
    expect(mt).to.deep.eq(recreatedBoolean);
    expect(recreatedBoolean).to.be.instanceOf(MultipleTypes);
    expect(recreatedBoolean.boolean).to.be.eq(mt.boolean);

    mt.boolean = false;
    const booleanObject2 = JSON.stringify(mt);
    const recreatedBoolean2 = regEntityDef.build(JSON.parse(booleanObject2)) as MultipleTypes;

    // console.log(booleanObject2, recreatedBoolean2);
    expect(mt).to.deep.eq(recreatedBoolean2);
    expect(recreatedBoolean2).to.be.instanceOf(MultipleTypes);
    expect(recreatedBoolean2.boolean).to.be.eq(mt.boolean);

    // string
    mt.string = 'this is a string';
    const strObject = JSON.stringify(mt);
    const recreatedString = regEntityDef.build(JSON.parse(strObject)) as MultipleTypes;

    // console.log(strObject, recreatedString);
    expect(mt).to.deep.eq(recreatedString);
    expect(recreatedString).to.be.instanceOf(MultipleTypes);
    expect(recreatedString.string).to.be.eq(mt.string);

    // date
    mt.date = new Date();
    const dateObject = JSON.stringify(mt);
    const recreatedDate = regEntityDef.build(JSON.parse(dateObject)) as MultipleTypes;

    // console.log(dateObject, recreatedDate);
    expect(mt).to.deep.eq(recreatedDate);
    expect(recreatedDate).to.be.instanceOf(MultipleTypes);
    expect(recreatedDate.date).to.be.instanceOf(Date);
    expect(recreatedDate.date.toISOString()).to.be.eq(mt.date.toISOString());

    // // date
    // mt.buffer = new Date();
    // const dateObject = JSON.stringify(mt);
    // const recreatedDate = regEntityDef.build(JSON.parse(dateObject)) as MultipleTypes;
    //
    // console.log(dateObject, recreatedDate);
    // expect(mt).to.deep.eq(recreatedDate);
    // expect(recreatedDate).to.be.instanceOf(MultipleTypes);
    // expect(recreatedDate.date).to.be.instanceOf(Date);
    // expect(recreatedDate.date.toISOString()).to.be.eq(mt.date.toISOString());

  }


  @test
  'check js types on embedded objects during json to object conversion'() {
    const registry = TypeOrmEntityRegistry.$();
    const regEntityDef = registry.getEntityRefFor(EmbeddedMultipleTypes);
    const properties = regEntityDef.getPropertyRefs();
    expect(properties).to.have.length(3);

    const emt = new EmbeddedMultipleTypes();
    emt.object = new MultipleTypes();
    emt.object.number = 12345;
    emt.object.boolean = false;
    emt.object.string = 'this is a string';
    emt.object.date = new Date();
    // empty

    emt.objects = [new MultipleTypes()];
    emt.objects[0].number = 12345;
    emt.objects[0].string = 'this is a string';
    emt.objects[0].date = new Date();
    emt.objects[0].boolean = true;

    const stringifiedObject = JSON.stringify(emt);
    const recreatedObject = regEntityDef.build(JSON.parse(stringifiedObject)) as EmbeddedMultipleTypes;

    // console.log(stringifiedObject, recreatedObject);
    expect(recreatedObject).to.deep.eq(emt);
    expect(recreatedObject.object.date.toISOString()).to.be.eq(emt.object.date.toISOString());
    expect(recreatedObject.objects[0].date.toISOString()).to.be.eq(emt.objects[0].date.toISOString());

  }
}
