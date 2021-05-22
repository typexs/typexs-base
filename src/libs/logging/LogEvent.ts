import {get, isEmpty, assign, isString, isNumber, isError} from 'lodash';
import {Log} from './Log';
import {ILogEntry} from './ILogEntry';
import {DateUtils} from '../utils/DateUtils';

export class LogEvent {

  private level: 'INFO';

  private _message = '';

  prefix = '';

  private args: any[] = [];

  private time: Date;


  constructor(opts: ILogEntry) {
    if (opts.time) {
      opts.time = new Date();
    }
    this.prefix = [Log.prefix, get(opts, 'prefix', '')]
      .filter(x => !isEmpty(x)).join('__');
    this._message = opts.message;

    assign(this, opts);
  }


  message(): string {
    const _msgs: any[] = [];

    if (!isEmpty(this._message)) {
      _msgs.push(this._message);
    } else {
      // _msgs.push('')
    }

    if (!isEmpty(this.args)) {
      this.args.forEach(x => {
        if (isString(x)) {
          _msgs.push(x);
        } else if (isNumber(x)) {
          _msgs.push(x + '');
        } else if (isError(x)) {
          _msgs.push(x.stack);
        } else {
          _msgs.push(JSON.stringify(x, null, 2));
        }
      });
    }

    return _msgs.join('\n');
  }


  fullOut(): string {
    const msg = this.message();
    return '[' + DateUtils.format('YYYY.MM.DD HH:mm:ss.SSS', this.time) + '] ' + this.prefix + '' + this.level + ' ' + msg;
  }

}
