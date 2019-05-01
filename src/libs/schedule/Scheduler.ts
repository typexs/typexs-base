/**
 *
 * Define and control schedules
 *
 * - reschedule calculation adapter
 * -- cron
 *
 *
 * - schedule execution adapter
 * -- for event firing
 * -- for task execution
 *
 * configurable
 *
 * schedules:
 *  - cron: '* * * * *'
 *    event:
 *      name: ActionEvent | action_event
 *      params:
 *        ...
 *  - offset: 10000
 *    start: Date | Time
 *    event:
 *      name: ActionEvent | action_event
 *      params:
 *        ...
 *  - offset: 10000
 *    start: Date | Time
 *    task:
 *      name: ActionTask | action_task
 *      params:
 *        ...
 *
 */
import {Schedule} from "./Schedule";

export interface IScheduleExecute {

}

export interface IScheduleCalc {

}

export interface IScheduleDef extends IScheduleCalc, IScheduleExecute {

}


export class Scheduler {

  private schedules: Schedule[] = [];



  prepare() {

  }

  shutdown() {

  }

  register(schedule: IScheduleDef) {

  }

  get() {

  }

  unregister() {

  }
}
