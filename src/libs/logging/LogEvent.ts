import * as _ from 'lodash'
import {EventBus} from "commons-eventbus";
import * as moment from "moment";
import {Log} from "./Log";


export default class LogEvent {

  private level: 'INFO';

  private _message: string = '';

  private prefix:string = ''

  private args: any[] = [];

  private time: Date;

  constructor(opts: { level?: string, message?: string, args?: any[], time?: Date, [k: string]: any }) {
    if (opts.time) {
      opts.time = new Date()
    }
    this.prefix = _.get(opts,'prefix','')
    this._message = opts.message;
    _.assign(this, opts)
  }

  fire() {
    EventBus.postAndForget(this)
  }

  message(): string {
    let _msgs: any[] = [];

    if (!_.isEmpty(this._message)) {
      _msgs.push(this._message)
    } else {
      // _msgs.push('')
    }

    if (!_.isEmpty(this.args)) {
      this.args.forEach(x => {
        if (_.isString(x)) {
          _msgs.push(x);
        } else if (_.isNumber(x)) {
          _msgs.push(x + '');
        } else if (_.isError(x)) {
          _msgs.push(x.stack);
        } else {
          _msgs.push(JSON.stringify(x, null, 2));
        }
      });
    }
    return _msgs.join('\n')
  }


  fullOut(): string {
    let msg = this.message();
    return '[' + moment(this.time).format('YYYY.MM.DD HH:mm:ss.SSS') + '] ' +this.prefix+''+ this.level + ' ' + msg
  }

}
