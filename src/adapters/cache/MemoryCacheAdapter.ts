import * as _ from 'lodash';
import {ICacheAdapter} from "../../libs/cache/ICacheAdapter";
import {ICacheBinConfig} from "../../libs/cache/ICacheBinConfig";
import {ICacheSetOptions} from "../../libs/cache/ICacheOptions";
import {CryptUtils} from "commons-eventbus/utils/CryptUtils";


export class MemoryCacheAdapter implements ICacheAdapter {

  readonly type: string = 'memory';

  name: string;

  options: ICacheBinConfig;

  data: { [bin: string]: { [k: string]: any } } = {};

  hasRequirements(): boolean {
    return true;
  }

  configure(name: string, options: ICacheBinConfig): void {
    this.name = name;
    this.options = options;
  }

  get(key: string, bin: string, options: ICacheSetOptions): any {
    let xkey = CryptUtils.shorthash(key);
    return _.get(this.data, [bin, xkey].join('.'), null)
  }

  set(key: string, value: any, bin: string, options: ICacheSetOptions): any {
    let xkey = CryptUtils.shorthash(key);
    if (_.isNull(value)) {
      delete this.data[bin][xkey];
    } else {
      _.set(this.data, [bin, xkey].join('.'), value);
    }

    return value;
  }

  shutdown(): void {
  }


}
