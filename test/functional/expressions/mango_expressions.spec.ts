import {expect} from 'chai';
import {suite, test} from 'mocha-typescript';
import {MangoExpression} from '../../../src/libs/expressions/MangoExpression';
import {inspect} from 'util';
import {Match} from '../../../src/libs/expressions/operators/stage/Match';
import {IMangoWalker} from '../../../src/libs/expressions/IMangoWalker';
import {PAst} from '../../../src/libs/expressions/ast/PAst';
import {And} from '../../../src/libs/expressions/operators/logic/And';
import {ClassUtils} from 'commons-base';
import {AbstractCompare} from '../../../src/libs/expressions/operators/compare/AbstractCompare';
import {Or} from '../../../src/libs/expressions/operators/logic/Or';
import {PValue} from '../../../src/libs/expressions/ast/PValue';

const visitor = new class implements IMangoWalker {
  onValue(ast: PAst): any {
    // console.log('onValue ' + ClassUtils.getClassName(ast as any) + ' ' + ast.key);
    return {};
  }


  onOperator(ast: PAst): any {
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
    // console.log(inspect(matchExp, false, 10));

    const result = matchExp.visit(visitor);
    // console.log(result);
    expect(matchExp).to.be.instanceOf(Match);
    expect(result).to.be.deep.eq({test: 'test < 1'});
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
    expect(result).to.be.deep.eq({ and: [ { test: 'test < 1' }, { hallo: 'hallo = welt' } ] });
  }

}

