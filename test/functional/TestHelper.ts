import * as _ from 'lodash';
export class TestHelper {

  static wait(ms: number) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    })
  }

  static logEnable(set?:boolean){
    return process.env.CI_RUN ? false : _.isBoolean(set) ? set : true;
  }
}
