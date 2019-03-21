import {TransformableInfo} from 'logform';

import {Log} from "./Log";
import * as stringify from 'fast-safe-stringify';
import {MESSAGE, SPLAT} from "triple-beam";
import {LogEvent} from "./LogEvent";
import * as _ from "lodash";

function replacer(key: any, value: any) {
  return value instanceof Buffer
    ? value.toString('base64')
    : value;
}

export class DefaultJsonFormat {

  options: any = {};

  constructor(opts?: any) {
    this.options = opts;

  }

  transform(info: TransformableInfo, opts: any = {}): any {
    let now = Date.now();
    info['timestamp'] = now;
    info['options'] = opts;

    let prefix = [Log.prefix ? Log.prefix : ''];
    if (info['event'] && info['event'] instanceof LogEvent) {
      if (info['event'].prefix) {
        prefix.push(info['event'].prefix);
      }
    }

    info['prefix'] = prefix.filter(x => !_.isEmpty(x)).join(':');

    // Return string will be passed to logger.
    info[MESSAGE] = stringify.default(info, opts.replacer || replacer, opts.space);
    return info;
  };


}
