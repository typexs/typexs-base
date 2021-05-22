import {setTimeout} from 'timers';
import {Schedule} from '../../libs/schedule/Schedule';
import {get, has, isNumber} from 'lodash';
import {IScheduleDef} from '../../libs/schedule/IScheduleDef';
import {IScheduleFactory} from '../../libs/schedule/IScheduleFactory';
import {Log} from '../../libs/logging/Log';
import {DateUtils} from '../../libs/utils/DateUtils';

export class DefaultScheduleFactory implements IScheduleFactory {


  convertUnit(unit: string) {
    switch (unit) {
      case 'ms':
        return 'milliseconds';
      case 's':
        return 'seconds';
      case 'm':
        return 'minutes';
      case 'h':
        return 'hours';
      case 'd':
        return 'days';
      case 'w':
        return 'weeks';
    }
    return unit;
  }

  create(date: Date, offset: number, unit: string) {
    unit = this.convertUnit(unit);
    return async function () {
      if (!this.offset) {
        this.offset = offset;
        this.unit = unit;
      }

      const now = new Date();
      this.last = this.next ? this.next : date;

      let next = this.last;
      while (next <= now) {
        const opts = {[this.unit]: this.offset};
        next = DateUtils.add(opts, next);
      }
      this.next = next;
      const offsetn = next.getTime() - (new Date()).getTime();

      Log.info('schedule [' + this.name + ']: next scheduled reload on ' + this.next);
      this.timer = setTimeout(this.runSchedule.bind(this), offsetn);
    };
  }


  async attach(schedule: Schedule): Promise<boolean> {
    const offset: string | number = get(schedule.options, 'offset', null);
    const start: string | Date = get(schedule.options, 'start', new Date());

    if (offset && start) {

      let startDate: Date = null;
      if (start instanceof Date) {
        startDate = start;
      } else if (/^\d+(:\d{2})+$/.test(start.trim())) {
        const time = start.trim().split(':');
        let m = null;
        if (time.length === 2) {
          m = DateUtils.get({
            hour: (parseInt(time.shift(), 0)),
            minute: (parseInt(time.shift(), 0)),
            second: 0,
            millisecond: 0
          });
          startDate = m.toJSDate();
        } else if (time.length === 3) {
          m = DateUtils.get({
            hour: (parseInt(time.shift(), 0)),
            minute: (parseInt(time.shift(), 0)),
            second: (parseInt(time.shift(), 0)),
            millisecond: 0
          });
          startDate = m.toJSDate();
        }
      } else {
        try {
          startDate = DateUtils.fromISO(start);
        } catch (err) {
          Log.error('cant parse date from ' + startDate);
        }
      }

      let unit = 'ms';
      let offsetN: number = null;
      if (isNumber(offset)) {
        offsetN = offset;
      } else if (/^\d+\w+$/.test(offset)) {
        offsetN = parseInt(offset.substr(0, offset.length - 1), 0);
        unit = offset.replace(offsetN + '', '');
      }

      if (startDate && offsetN && unit) {
        const startup = get(schedule.options, 'startup', false);
        if (startup) {
          // startDate = DateTime.now().plus({minutes: 1}).toJSDate();
          startDate = DateUtils.add({minutes: 1});
        }
        schedule.reschedule = this.create(startDate, offsetN, unit);
        return true;
      }
    }
    return false;
  }


  async detect(opts: IScheduleDef) {
    return has(opts, 'offset');
  }


  async isAvailable() {
    return true;
  }
}
