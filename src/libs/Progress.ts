import {EventEmitter} from 'events';


import {clearTimeout, setTimeout} from 'timers';
import Timer = NodeJS.Timer;


export class Progress extends EventEmitter {

  options: any = {};

  progressing = false;
  active = 0;

  timer: Timer = null;
  done = 0;

  // enqueued = 0;

  constructor(options: any = {}) {
    super();
    this.setMaxListeners(10000);
    this.options = options;
  }

  waitTillDone() {
    const self = this;
    if (!self.progressing) {
      return Promise.resolve(self.progressing);
    }
    return new Promise((resolve, reject) => {
      if (!self.progressing) {
        resolve(self.progressing);
      } else {
        self.once('empty', function () {
          resolve(self.progressing);
        });
      }
    });
  }

  check(): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(reject, 1000);
      this.once('empty', function () {
        clearTimeout(timer);
        resolve(null);
      });
    });
  }

  async startWhenReady(): Promise<boolean> {
    const my = this.active;
    this.active++;

    const self = this;
    if (!self.progressing) {
      self.progressing = true;
    }

    while (this.done < my) {
      try {
        await this.check();
      } catch (err) {
        break;
      }
    }
    return true;
  }


  ready() {
    this.done++;
    this.progressing = false;
    if (this.options.timeout > 0) {
      this.timer = setTimeout(() => {
        this.emit('empty');
      }, this.options.timeout);

    } else {
      this.emit('empty');
    }


  }

}
