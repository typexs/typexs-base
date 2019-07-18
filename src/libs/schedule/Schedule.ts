import {clearTimeout} from 'timers';
import {IScheduleDef} from './IScheduleDef';
import Timer = NodeJS.Timer;


export class Schedule {

  options: IScheduleDef;

  name: string;

  timer: Timer;

  last: Date = null;

  next: Date = null;

  enable = false;

  reschedule: Function;

  execute: Function;

  lastResults: any;

  constructor(o: IScheduleDef) {
    this.options = o;
    this.name = o.name;
  }

  doReschedule() {
    if (this.reschedule) {
      this.reschedule.bind(this)();
    }
  }

  async runSchedule() {
    if (this.execute) {
      this.lastResults = await this.execute.bind(this)();
    }
    clearTimeout(this.timer);
    this.doReschedule();
  }


  shutdown() {
    this.enable = false;
    clearTimeout(this.timer);
  }
}
