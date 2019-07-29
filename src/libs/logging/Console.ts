import {Log} from './Log';

export class Console {


  static println(type: 'error' | 'log', ...msg: any[]) {
    if (type === 'error') {
      console.error(...msg);
    } else {
      console.log(...msg);
    }

    // Log.info(msg);
  }


  static log(...msg: any[]) {
    this.println('log', ...msg);
  }


  static error(...msg: any[]) {
    this.println('error', ...msg);
  }
}
