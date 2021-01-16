import * as _ from 'lodash';
import {ICacheAdapter} from '../../libs/cache/ICacheAdapter';
import {ICacheBinConfig} from '../../libs/cache/ICacheBinConfig';
import {ICacheGetOptions, ICacheSetOptions} from '../../libs/cache/ICacheOptions';
import {CryptUtils} from '@allgemein/base';


export class MemoryCacheAdapter implements ICacheAdapter {

  readonly type: string = 'memory';

  name: string;

  options: ICacheBinConfig;

  data: { [bin: string]: { [k: string]: any } } = {};

  timer: { [k: string]: any } = {};

  hasRequirements(): boolean {
    return true;
  }

  configure(name: string, options: ICacheBinConfig): void {
    this.name = name;
    this.options = options;
  }

  get(key: string, bin: string, options?: ICacheGetOptions): any {
    const xkey = CryptUtils.shorthash(key);
    return _.get(this.data, [bin, xkey].join('.'), null);
  }

  set(key: string, value: any, bin: string, options?: ICacheSetOptions): any {
    const xkey = CryptUtils.shorthash(key);
    if (_.isNull(value)) {
      delete this.data[bin][xkey];
    } else {
      const k = [bin, xkey].join('.');
      _.set(this.data, k, value);
      if (this.timer[k]) {
        clearTimeout(this.timer[k]);
        delete this.timer[k];
      }
      if (options && options.ttl) {
        this.timer[k] = setTimeout(() => {
          delete this.data[bin][xkey];
          delete this.timer[k];
        }, options.ttl);
      }
    }

    return value;
  }


  clearBin(name: string): void {
    this.data[name] = {};
  }

  shutdown(): void {
    _.keys(this.timer).forEach(k => {
      clearTimeout(this.timer[k]);
      delete this.timer[k];
    });
  }


}
