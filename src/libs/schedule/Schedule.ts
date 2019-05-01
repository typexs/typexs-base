import {clearTimeout} from "timers";
import {IScheduleDef} from "./IScheduleDef";
import Timer = NodeJS.Timer;


export class Schedule {

  options: IScheduleDef;

  name: string;

  timer: Timer;

  last: Date = null;

  next: Date = null;

  enable: boolean = false;

  reschedule: Function;

  execute: Function;

  constructor(o: IScheduleDef) {
    this.options = o;
    this.name = o.name;
  }

  doReschedule() {
    if (this.reschedule) {
      this.reschedule.bind(this)()
    }
  }

  runSchedule() {
    if (this.execute) {
      this.execute.bind(this)()
    }
    clearTimeout(this.timer);
    this.doReschedule();
  }


  shutdown() {
    this.enable = false;
    clearTimeout(this.timer);
  }
}
