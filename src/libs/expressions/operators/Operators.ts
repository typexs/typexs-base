import {Substr} from './string/Substr';
import {PAst} from '../ast/PAst';
import {ToUpper} from './string/ToUpper';
import {ToLower} from './string/ToLower';
import {ToInt} from './string/ToInt';
import {ToFloat} from './string/ToFloat';
import {Map} from './array/Map';
import {First} from './array/First';
import {Last} from './array/Last';
import {Match} from './stage/Match';
import {LessThen} from './compare/LessThen';
import {MangoExpression} from '../MangoExpression';
import {And} from './logic/And';
import {Or} from './logic/Or';
import {LessThenEqual} from './compare/LessThenEqual';
import {Equal} from './compare/Equal';
import {GreaterThen} from './compare/GreaterThen';
import {GreaterThenEqual} from './compare/GreaterThenEqual';
import {In} from './compare/In';
import {IsNotNull} from './compare/IsNotNull';
import {IsNull} from './compare/IsNull';
import {Like} from './compare/Like';
import {NotEqual} from './compare/NotEqual';
import {NotIn} from './compare/NotIn';
import {Project} from './stage/Project';
import {Year} from './date/Year';
import {Month} from './date/Month';
import {Day} from './date/Day';
import {Group} from './stage/Group';
import {Sum} from './arithmetic/Sum';
import {Min} from './arithmetic/Min';
import {Max} from './arithmetic/Max';
import {Avg} from './arithmetic/Avg';
import {Count} from './arithmetic/Count';
import {Limit} from './stage/Limit';
import {Skip} from './stage/Skip';
import {Sort} from './stage/Sort';
import {Date} from './date/Date';
import {Context} from '../ast/Context';
import {Not} from './logic/Not';
import {Multiply} from './arithmetic/Multiply';

export class Operators {
  static operators: { [k: string]: Function } = {};

  static install(name: string, opertor: Function) {
    Operators.operators[name] = opertor;
  }

  static create(name: string, e: MangoExpression, p?: PAst, ctxt?: Context) {
    if (this.operators[name]) {
      return Reflect.construct(this.operators[name], [e, p, ctxt]);
    } else {
      throw new Error(`no such operator ${name} defined`);
    }
  }
}

/*
 *  Logic operators
 */
Operators.install(And.NAME, And);
Operators.install(Or.NAME, Or);
Operators.install(Not.NAME, Not);

/*
 *  Stage operators
 */
Operators.install(Match.NAME, Match);
Operators.install(Project.NAME, Project);
Operators.install(Group.NAME, Group);
Operators.install(Limit.NAME, Limit);
Operators.install(Skip.NAME, Skip);
Operators.install(Sort.NAME, Sort);

/*
 *  Date operators
 */
Operators.install(Year.NAME, Year);
Operators.install(Month.NAME, Month);
Operators.install(Day.NAME, Day);
Operators.install(Date.NAME, Date);

/*
 *  Arithmetic operators
 */
Operators.install(Sum.NAME, Sum);
Operators.install(Min.NAME, Min);
Operators.install(Max.NAME, Max);
Operators.install(Avg.NAME, Avg);
Operators.install(Count.NAME, Count);
Operators.install(Multiply.NAME, Multiply);

/*
 *  Compare operators
 */
Operators.install(LessThen.NAME, LessThen);
Operators.install(LessThenEqual.NAME, LessThenEqual);
Operators.install(Equal.NAME, Equal);
Operators.install(GreaterThen.NAME, GreaterThen);
Operators.install(GreaterThenEqual.NAME, GreaterThenEqual);
Operators.install(In.NAME, In);
Operators.install(IsNotNull.NAME, IsNotNull);
Operators.install(IsNull.NAME, IsNull);
Operators.install(Like.NAME, Like);
Operators.install(NotEqual.NAME, NotEqual);
Operators.install(NotIn.NAME, NotIn);

/*
 *  String operators
 */
Operators.install(Substr.NAME, Substr);
Operators.install(ToUpper.NAME, ToUpper);
Operators.install(ToLower.NAME, ToLower);
Operators.install(ToInt.NAME, ToInt);
Operators.install(ToFloat.NAME, ToFloat);

/*
 *  Array operators
 */
Operators.install(Map.NAME, Map);
Operators.install(First.NAME, First);
Operators.install(Last.NAME, Last);
