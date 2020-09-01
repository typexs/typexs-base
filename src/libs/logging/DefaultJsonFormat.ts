import {TransformableInfo} from 'logform';

import {Log} from './Log';
import * as stringify from 'fast-safe-stringify';
import {LogEvent} from './LogEvent';
import * as _ from 'lodash';
import {MESSAGE} from 'triple-beam';

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
    const now = Date.now();
    info['timestamp'] = now;
    info['options'] = opts;

    const prefix = [Log.prefix ? Log.prefix : ''];
    if (info['event'] && info['event'] instanceof LogEvent) {
      if (info['event'].prefix) {
        prefix.push(info['event'].prefix);
      }
    }

    info['prefix'] = prefix.filter(x => !_.isEmpty(x)).join(':');

    // Return string will be passed to logger.
    // @ts-ignore
    info[MESSAGE] = stringify.default(info, opts.replacer || replacer, opts.space);
    return info;
  }


}
