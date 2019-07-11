
import {setTimeout} from 'timers';
import {Schedule} from '../../libs/schedule/Schedule';
import * as _ from 'lodash';
import {IScheduleDef} from '../../libs/schedule/IScheduleDef';
import {IScheduleFactory} from '../../libs/schedule/IScheduleFactory';
import {Log} from '../../libs/logging/Log';

export class CronScheduleFactory implements IScheduleFactory {

  static LIB: any;


  create(cronPattern: string) {
    return async function () {
      this.cron = CronScheduleFactory.LIB.parseExpression(cronPattern);
      this.last = this.next;
      const now = new Date();
      const next = this.cron.next();
      const offset = next.getTime() - now.getTime();
      this.next = new Date(next.getTime());
      Log.info('schedule [' + this.name + ']: next scheduled reload on ' + this.next);
      this.timer = setTimeout(this.runSchedule.bind(this), offset);
    };
  }


  async attach(schedule: Schedule): Promise<boolean> {
    const cronPattern = _.get(schedule.options, 'cron', null);
    if (cronPattern) {
      schedule.reschedule = this.create(cronPattern);
      return true;
    }
    return false;
  }


  async detect(opts: IScheduleDef) {
    return _.has(opts, 'cron');
  }


  async isAvailable() {
    try {
      CronScheduleFactory.LIB = await import('cron-parser');
      return true;
    } catch (err) {
      Log.warn('cron-parser is not installed. ');
      return false;
    }
  }
}
