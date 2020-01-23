import * as _ from 'lodash';
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
import {Schedule} from './Schedule';
import {IScheduleFactory} from './IScheduleFactory';
import {IScheduleDef} from './IScheduleDef';


export class Scheduler {

  static NAME: string = Scheduler.name;

  private factories: IScheduleFactory[] = [];


  private schedules: Schedule[] = [];


  async prepare(factories: IScheduleFactory[]) {
    for (const f of factories) {
      if (await f.isAvailable()) {
        this.factories.push(f);
      }
    }
  }


  async register(schedule: IScheduleDef) {
    const exists = _.find(this.schedules, s => s.name === schedule.name);
    if (exists) {
      throw new Error('schedule with name ' + schedule.name + ' already exists');
    }

    const s = new Schedule(schedule);
    this.schedules.push(s);
    for (const f of this.factories) {
      if (await f.detect(schedule)) {
        await f.attach(s);
      }
    }
    s.doReschedule();
    return s;
  }

  /**
   * TODO
   */
  get() {

  }

  /**
   * TODO
   */
  unregister() {

  }


  async shutdown() {
    await Promise.all(this.schedules.map(async x => x.shutdown()));
  }
}
