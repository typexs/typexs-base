export class TaskState {

  pid: string;

  name: string;

  created: Date = new Date();

  start: Date;

  stop: Date;

  duration: number;

  weight: number = 0;

  done: boolean = false;

  running: boolean = false;

  incoming: any = {};

  outgoing: any = {};

  result: any = null;

  error: Error = null;


  calcDuration() {
    this.duration = this.stop.getTime() - this.start.getTime();
  }

}
