import {isEmpty, remove} from 'lodash';
import {EventEmitter} from 'events';
import {Semaphore} from './Semaphore';

export class LockFactory extends EventEmitter {

  constructor() {
    super();
    this.setMaxListeners(10000);
  }


  static NAME: string = LockFactory.name;

  static __self__: LockFactory;

  private semaphores: Semaphore[] = [];

  static $() {
    if (!this.__self__) {
      this.__self__ = new LockFactory();
    }
    return this.__self__;
  }

  static reset() {
    this.__self__ = null;
  }

  semaphore(max: number) {
    const sem = new Semaphore(max);
    this.semaphores.push(sem);
    return sem;
  }

  remove(s: Semaphore) {
    remove(this.semaphores, s);
    if (isEmpty(this.semaphores)) {
      this.emit('empty');
    }
  }


  await(): Promise<any> {
    if (isEmpty(this.semaphores)) {
      return Promise.resolve();
    } else {
      return new Promise(resolve => {
        this.once('empty', () => {
          resolve(null);
        });
      });
    }
  }

  async shutdown(timeout = 10000) {
    await Promise.all(this.semaphores.map(x => <Promise<any>>x.await(timeout)));
    for (const s of this.semaphores.reverse()) {
      try {
        s.purge();
      } catch (e) {
      }
      this.remove(s);
    }

  }

}
