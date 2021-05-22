import {DateTime} from 'luxon';
import {DateObject as WrapperDateObject} from 'luxon/src/datetime';
import {DurationInput} from 'luxon/src/duration';

// tslint:disable-next-line:no-empty-interface
export interface DateObject extends WrapperDateObject {

}

export class DateUtils {

  static format(format: string, date: Date = new Date()) {
    format = format.replace('YYYY', 'yyyy');
    format = format.replace('DD', 'dd');
    return DateTime.fromJSDate(date).toFormat(format);
  }


  static toISO(date: Date) {
    return DateTime.fromJSDate(date).toISO();
  }

  static fromISO(date: string) {
    return DateTime.fromISO(date).toJSDate();
  }

  static get(object: DateObject) {
    return DateTime.fromObject(object);
  }

  static add(add: DurationInput, date: Date = new Date()) {
    return DateTime.fromJSDate(date).plus(add).toJSDate();
  }

}
