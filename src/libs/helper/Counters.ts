import * as _ from 'lodash';
import {Counter} from './Counter';

/**
 * Collection of counting objects
 */
export class Counters {

  counter: Counter[] = [];

  get(key: string) {
    const prev = this.counter.find(x => x.key === key);
    if (prev) {
      return prev;
    }
    const n = new Counter(key);
    this.counter.push(n);
    return n;
  }


  remove(key: string) {
    return _.remove(this.counter, x => x.key === key).shift();
  }


  asObject() {
    const obj: any = {};
    for (const c of this.counter) {
      _.set(obj, c.key, c.value);
    }
    return obj;
  }

}
