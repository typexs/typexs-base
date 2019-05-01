import {setTimeout, clearTimeout} from "timers";
import Timer = NodeJS.Timer;

export class Schedule {

  timer: Timer;

  last: Date = null;

  next: Date = null;

  enable: boolean = false;


  reschedule(){

  }
}
