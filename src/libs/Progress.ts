import {EventEmitter} from 'events'


import {clearTimeout, setTimeout} from "timers";
import Timer = NodeJS.Timer;


export class Progress extends EventEmitter {

  options: any = {};

  progressing: boolean = false;
  active: number = 0;

  timer: Timer = null;
  done: number = 0;
  enqueued: number = 0;

  constructor(options: any = {}) {
    super();
    this.setMaxListeners(10000);
    this.options = options;
  }

  waitTillDone() {
    let self = this;
    return new Promise((resolve, reject) => {
      if (!self.progressing) {
        resolve(self.progressing)
      } else {
        self.once('empty', function () {
          resolve(self.progressing)
        })
      }
    })
  }

  check(): Promise<any> {
    return new Promise((resolve, reject) => {
      let timer = setTimeout(reject, 10000);
      this.once('empty', function () {
        clearTimeout(timer);
        resolve()
      })
    })
  }

  async startWhenReady(): Promise<boolean> {
    let my = this.active;
    this.active++;

    let self = this;
    let siwtched = false;

    if (!self.progressing) {
      self.progressing = siwtched = true;
    }

    while (this.done < my) {
      try {
        await this.check()
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
      }, this.options.timeout)

    } else {
      this.emit('empty');
    }


  }

}
