import {TransformableInfo} from 'logform';
import * as moment from "moment";
import * as _ from "lodash";
import {Log} from "./Log";

import {MESSAGE, SPLAT} from "triple-beam";
import {LogEvent} from "./LogEvent";

export class DefaultFormat {

  options: any = {};

  constructor(opts?: any) {
    this.options = opts;
  }


  transform(info: TransformableInfo, opts: any = {}): any {
    // Return string will be passed to logger.
    let prefix = [Log.prefix ? Log.prefix : ''];
    if (info['event'] && info['event'] instanceof LogEvent) {
      if (info['event'].prefix) {
        prefix.push(info['event'].prefix);
      }
    }

    let _prefix = prefix.filter(x => !_.isEmpty(x)).join(':');

    info[MESSAGE] = '[' + moment(Date.now()).format('YYYY.MM.DD HH:mm:ss.SSS') + '] ' +
      _prefix +
      ' [' + info.level.toUpperCase() + ']' + ' '.repeat(7 - info.level.length) +
      (info.message ? info.message : '') +
      (info.meta && Object.keys(info.meta).length ? '\n\t' + JSON.stringify(info.meta) : '');

    return info; // ['message'];
  };


}
