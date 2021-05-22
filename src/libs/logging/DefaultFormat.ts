import {isEmpty} from 'lodash';
import {TransformableInfo} from 'logform';
import {Log} from './Log';
import {MESSAGE} from 'triple-beam';
import {LogEvent} from './LogEvent';
import {DateUtils} from '../utils/DateUtils';

export class DefaultFormat {

  options: any = {};

  constructor(opts?: any) {
    this.options = opts;
  }


  transform(info: TransformableInfo, opts: any = {}): any {
    // Return string will be passed to logger.
    const prefix = [Log.prefix ? Log.prefix : ''];
    if (info['event'] && info['event'] instanceof LogEvent) {
      if (info['event'].prefix) {
        prefix.push(info['event'].prefix);
      }
    }

    const _prefix = prefix.filter(x => !isEmpty(x)).map(x => x.trim()).join(':');

    // @ts-ignore
    info[MESSAGE] = '[' + DateUtils.format('YYYY.MM.DD HH:mm:ss.SSS') + '] ' +
      ' [' + info.level.toUpperCase() + ']' + ' '.repeat(7 - info.level.length) +
      _prefix + ' | ' +
      (info.message ? info.message : '') +
      (info.meta && Object.keys(info.meta).length ? '\n\t' + JSON.stringify(info.meta) : '');

    return info; // ['message'];
  }


}
