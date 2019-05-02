import {Log} from "../..";
import {setTimeout} from "timers";
import {Schedule} from "../../libs/schedule/Schedule";
import * as _ from "lodash";
import {IScheduleDef} from "../../libs/schedule/IScheduleDef";
import {IScheduleFactory} from "../../libs/schedule/IScheduleFactory";
import moment = require("moment");

export class DefaultScheduleFactory implements IScheduleFactory {


  create(date: Date, offset: number, unit: string) {
    return async function () {
      if (!this.offset) {
        this.offset = offset;
        this.unit = unit;
      }

      let now = new Date();
      this.last = this.next ? this.next : date;

      let next = this.last;
      while (next <= now) {
        next = moment(next).add(this.offset, this.unit).toDate();
      }
      this.next = next;
      let offsetn = next.getTime() - (new Date()).getTime();

      Log.info('schedule [' + this.name + ']: next scheduled reload on ' + this.next);
      this.timer = setTimeout(this.runSchedule.bind(this), offsetn);
    }
  }


  async attach(schedule: Schedule): Promise<boolean> {
    let offset: string | number = _.get(schedule.options, 'offset', null);
    let start: string | Date = _.get(schedule.options, 'start', new Date());
    if (offset && start) {

      let startDate: Date = null;
      if (start instanceof Date) {
        startDate = start;
      } else if (/^\d+(:\d{2})+$/.test(start.trim())) {
        let time = start.trim().split(':');
        let m = moment();
        if (time.length == 2) {
          m.hour(parseInt(time.shift()));
          m.minute(parseInt(time.shift()));
          m.seconds(0);
          m.milliseconds(0);
          startDate = m.toDate();
        } else if (time.length == 3) {
          m.hours(parseInt(time.shift()));
          m.minutes(parseInt(time.shift()));
          m.seconds(parseInt(time.shift()));
          m.milliseconds(0);
          startDate = m.toDate();
        }
      } else {
        try {
          startDate = moment(start).toDate()
        } catch (err) {
          Log.error('cant parse date from ' + startDate);
        }
      }

      let unit = 'ms';
      let offsetN: number = null;
      if (_.isNumber(offset)) {
        offsetN = offset;
      } else if (/^\d+\w+$/.test(offset)) {
        offsetN = parseInt(offset.substr(0, offset.length - 1));
        unit = offset.replace(offsetN + '', '');
      }

      if (startDate && offsetN && unit) {
        schedule.reschedule = this.create(startDate, offsetN, unit);
        return true;
      }
    }
    return false;
  }


  async detect(opts: IScheduleDef) {
    return _.has(opts, 'offset');
  }


  async isAvailable() {
    return true;
  }
}
