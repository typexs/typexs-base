import {suite, test} from '@testdeck/mocha';
import {expect} from 'chai';

import * as _ from 'lodash';
import {Car} from './entities/Car';

import {ComplexIdsKeys} from './entities/ComplexIdsKeys';
import {Expressions} from '@allgemein/expressions';
import {TypeOrmEntityRegistry} from '../../../../src/libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry';


@suite('functional/storage/typeorm/entity_id_handling')
class EntityIdHandlingSpec {


  @test
  async 'resolve entity ids from string'() {

    const registry = TypeOrmEntityRegistry.$();
    const entityDef = registry.getEntityRefFor(Car);

    let conditions = Expressions.parseLookupConditions(entityDef, '1');
    expect(_.has(conditions, 'id')).to.be.true;
    expect(conditions['id']).to.be.eq(1);

    // TODO move to Expressions
    // conditions = Expressions.parseLookupConditions(entityDef, 'id=1');
    // expect(_.has(conditions, 'id')).to.be.true;
    // expect(conditions['id']).to.be.eq(1);
    //
    // conditions = Expressions.parseLookupConditions(entityDef, '(id=1),(id=2)');
    // expect(conditions).to.have.length(2);
    // expect(conditions).to.be.deep.eq([{id: 1}, {id: 2}]);
    //
    conditions = Expressions.parseLookupConditions(entityDef, '1,2,3');
    expect(conditions).to.have.length(3);
    expect(conditions).to.be.deep.eq([{id: 1}, {id: 2}, {id: 3}]);

    conditions = Expressions.parseLookupConditions(entityDef, '(1),(2),(3)');
    expect(conditions).to.have.length(3);
    expect(conditions).to.be.deep.eq([{id: 1}, {id: 2}, {id: 3}]);

    const entityDefPKs = registry.getEntityRefFor(ComplexIdsKeys);


    // conditions = Expressions.parseLookupConditions(entityDefPKs, 'inc=1,code=\'test\'');
    // expect(conditions).to.be.deep.eq({inc: 1, code: 'test'});
    //
    // conditions = Expressions.parseLookupConditions(entityDefPKs, '(inc=1,code=\'test\'),(inc=2,code=\'test2\')');
    // expect(conditions).to.have.length(2);
    // expect(conditions).to.be.deep.eq([{inc: 1, code: 'test'}, {inc: 2, code: 'test2'}]);
    //
    // conditions = Expressions.parseLookupConditions(entityDefPKs, '(1,\'test\'),(2,\'test2\')');
    // expect(conditions).to.have.length(2);
    // expect(conditions).to.be.deep.eq([{inc: 1, code: 'test'}, {inc: 2, code: 'test2'}]);
    //
    // conditions = Expressions.parseLookupConditions(entityDefPKs, '1,\'test\'');
    // expect(conditions).to.be.deep.eq({inc: 1, code: 'test'});
  }

  @test
  async 'build entity ids to string'() {

    const registry = TypeOrmEntityRegistry.$();
    const entityDef = registry.getEntityRefFor(Car);

    let str = Expressions.buildLookupConditions(entityDef, {id: 1});
    expect(str).to.be.eq('1');

    str = Expressions.buildLookupConditions(entityDef, [{id: 1}, {id: 2}]);
    expect(str).to.be.eq('1,2');

    const entityDefPKs = registry.getEntityRefFor(ComplexIdsKeys);
    str = Expressions.buildLookupConditions(entityDefPKs, {inc: 1, code: 'test'});
    expect(str).to.be.eq('1,\'test\'');

    str = Expressions.buildLookupConditions(entityDefPKs, [{inc: 1, code: 'test'}, {inc: 2, code: 'test2'}]);
    expect(str).to.be.eq('(1,\'test\'),(2,\'test2\')');
  }

}

