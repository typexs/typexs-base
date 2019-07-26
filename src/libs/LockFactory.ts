import * as _ from 'lodash';
import {EventEmitter} from 'events';
import {Semaphore} from './Semaphore';

export class LockFactory extends EventEmitter {


  static NAME: string = LockFactory.name;

  private semaphores: Semaphore[] = [];

  constructor() {
    super();
    this.setMaxListeners(10000);
  }

  semaphore(max: number) {
    const sem = new Semaphore(max);
    this.semaphores.push(sem);
    return sem;
  }

  remove(s: Semaphore) {
    _.remove(this.semaphores, s);
    if (_.isEmpty(this.semaphores)) {
      this.emit('empty');
    }
  }


  await() {
    if (_.isEmpty(this.semaphores)) {
      return Promise.resolve();
    } else {
      return new Promise(resolve => {
        this.once('empty', resolve);
      });
    }
  }

  shutdown() {
    for (const s of this.semaphores.reverse()) {
      s.purge();
      this.remove(s);
    }
  }

}
