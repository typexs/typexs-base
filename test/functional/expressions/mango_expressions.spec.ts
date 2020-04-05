import {expect} from 'chai';
import {suite, test} from 'mocha-typescript';
import {MangoExpression} from '../../../src/libs/expressions/MangoExpression';
import {inspect} from 'util';
import {Match} from '../../../src/libs/expressions/operators/stage/Match';
import {IMangoWalker} from '../../../src/libs/expressions/IMangoWalker';
import {PAst} from '../../../src/libs/expressions/ast/PAst';
import {And} from '../../../src/libs/expressions/operators/logic/And';
import {AbstractCompare} from '../../../src/libs/expressions/operators/compare/AbstractCompare';
import {Or} from '../../../src/libs/expressions/operators/logic/Or';
import {PValue} from '../../../src/libs/expressions/ast/PValue';
import {Project} from '../../../src/libs/expressions/operators/stage/Project';
import {Not} from '../../../src/libs/expressions/operators/logic/Not';
import {PObject} from '../../../src/libs/expressions/ast/PObject';

const visitor = new class implements IMangoWalker {
  onValue(ast: PValue): any {
    // console.log('onValue ' + ClassUtils.getClassName(ast as any) + ' ' + ast.key);
    const isProject = ast.backwardCall(x => x instanceof Project);
    if (isProject) {
      return ast.value + '_projected';
    } else {
      return ast.value;
    }

  }


  onOperator(ast: PAst, value: any): any {
    // console.log('onOperator ' + ClassUtils.getClassName(ast as any) + ' ' + ast.key);
    if (ast instanceof AbstractCompare) {
      return ast.key + ' ' + ast.op + ' ' + (<PValue>ast.value).value;
    }
    return null;
  }

  visitOperator(ast: PAst): any {
    // console.log('visitOperator ' + ClassUtils.getClassName(ast as any) + ' ' + ast.key);
    return {};
  }

  leaveOperator(res: any, ast: PAst): any {
    // console.log('leaveOperator ' + ClassUtils.getClassName(ast as any) + ' ' + ast.key);
    if (ast instanceof And) {
      return {and: res};
    } else if (ast instanceof Or) {
      return {or: res};
    } else if (ast instanceof Not) {
      return 'not ' + res;
    }
    return res;
  }


  visitArray(ast: PAst): any[] {
    // console.log('visitArray ' + ClassUtils.getClassName(ast as any) + ' ' + ast.key);
    return [];
  }

  leaveArray(res: any[], ast: PAst): any {
    // console.log('leaveArray ' + ClassUtils.getClassName(ast as any) + ' ' + ast.key);
    return res;
  }

  visitObject(ast: PAst): any {
    // console.log('visitObject ' + ClassUtils.getClassName(ast as any) + ' ' + ast.key);
    return {};
  }

  leaveObject(res: any, ast: PAst): any {
    // console.log('leaveObject ' + ClassUtils.getClassName(ast as any) + ' ' + ast.key);
    return res;
  }
};


@suite('functional/expressions/mango_expressions')
class InjectSpec {


  @test
  async '$match'() {
    const exp = new MangoExpression({$match: {test: {$lt: 1}}});
    const matchExp = exp.getKey('$match');
    // console.log(inspect(exp, false, 10));

    const result = matchExp.visit(visitor);
    // console.log(result);
    expect(matchExp).to.be.instanceOf(Match);
    expect(result).to.be.deep.eq({test: 'test < 1'});
  }

  @test
  async 'single query'() {
    const exp = new MangoExpression({id: 1});
    // const matchExp = exp.getKey('$match');
    // console.log(inspect(exp, false, 10));

    const result = exp.getRoot().visit(visitor);
    // console.log(result);
    expect(exp.getRoot()).to.be.instanceOf(PObject);
    expect(result).to.be.deep.eq({id: 'id = 1'});
  }


  @test
  async '$match query without command - $lt'() {
    const exp = new MangoExpression({test: {$lt: 1}});
    // console.log(inspect(exp, false, 10));
    const result = exp.visit(visitor);
    expect(result).to.be.deep.eq({test: 'test < 1'});
  }

  @test
  async '$match query without command - $eq'() {
    const exp = new MangoExpression({test: {$eq: 1}});
    // console.log(inspect(exp, false, 10));
    const result = exp.visit(visitor);
    expect(result).to.be.deep.eq({test: 'test = 1'});
  }

  @test
  async '$match query without command - $eq (indirect)'() {
    const exp = new MangoExpression({test: 1});
    // console.log(inspect(exp, false, 10));
    const result = exp.visit(visitor);
    expect(result).to.be.deep.eq({test: 'test = 1'});
  }


  @test
  async '$match in array'() {
    const exp = new MangoExpression([{$match: {test: {$lt: 1}}}]);
    const matchExp = exp.getKey('$match');
    // console.log(inspect(exp, false, 10));
    // console.log(inspect(matchExp, false, 10));

    const result = matchExp.visit(visitor);
    // console.log(result);
    expect(matchExp).to.be.instanceOf(Match);
    expect(result).to.be.deep.eq({test: 'test < 1'});
  }

  @test
  async '$and conditions'() {
    const exp = new MangoExpression({$and: [{test: {$lt: 1}}, {hallo: 'welt'}]});
    const matchExp = exp.getRoot();
    // console.log(inspect(matchExp, false, 10));

    const result = matchExp.visit(visitor);
    // console.log(inspect(result, false, 10));
    expect(matchExp).to.be.instanceOf(And);
    expect(result).to.be.deep.eq({and: [{test: 'test < 1'}, {hallo: 'hallo = welt'}]});
  }


  @test
  async '$project - with field enabled)'() {
    const exp = new MangoExpression({$project: {test: 1}});
    // console.log(inspect(exp, false, 10));
    const result = exp.visit(visitor);
    expect(result).to.be.deep.eq({test: 'test_projected'});
  }

  @test
  async 'use chained operators'() {
    const exp = new MangoExpression({field: {$not: {$eq: 1}}});
    // console.log(inspect(exp, false, 10));
    const result = exp.visit(visitor);
    expect(result).to.be.deep.eq({field: 'not field = 1'});
  }

}

