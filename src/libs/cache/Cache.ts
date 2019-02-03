/**
 *
 * cache:
 *
 *   bins:
 *    default: default
 *
 *   adapter:
 *     default:
 *       type: redis
 *       host: localhost
 *       port: 6379
 *
 *
 */
import * as _ from 'lodash';
import {ICacheAdapter} from "./ICacheAdapter";
import {ClassType, XS_DEFAULT} from "commons-schema-api/browser";
import {ICacheConfig} from "./ICacheConfig";
import {ICacheGetOptions, ICacheSetOptions} from "./ICacheOptions";
import {CacheBin} from "./CacheBin";


export const DEFAULT_OPTIONS: ICacheConfig = {
  bins: {default: 'default'}
}

export class Cache {

  static NAME: string = 'Cache';

  private options: ICacheConfig = DEFAULT_OPTIONS;

  private adapterClasses: { type: string, clazz: ClassType<ICacheAdapter> }[] = [];

  private adapters: { [k: string]: ICacheAdapter } = {};

  private bins: { [k: string]: CacheBin } = {};


  getBin(name: string) {
    if (this.bins[name]) {
      return this.bins[name];
    }
    return this.bins[XS_DEFAULT];
  }


  async get(key: string, bin: string = XS_DEFAULT, options?: ICacheGetOptions) {
    let cacheBin = this.getBin(bin);
    return cacheBin.get(key, bin, options);
  }


  async set(key: string, value: any, bin: string = XS_DEFAULT, options?: ICacheSetOptions) {
    let cacheBin = this.getBin(bin);
    return cacheBin.set(key, value,bin, options);
  }


  async configure(config?: ICacheConfig) {
    if (config && _.isPlainObject(config)) {
      _.defaultsDeep(config || {}, DEFAULT_OPTIONS);
      this.options = config;
    }


    for (let key of _.keys(this.options.adapter)) {
      let adapterConfig = this.options.adapter[key];
      let entry = this.adapterClasses.find(c => c.type == adapterConfig.type);
      let adapter: ICacheAdapter = null;
      if (!entry) {
        entry = this.adapterClasses.find(c => c.type == 'memory');
        adapter = Reflect.construct(entry.clazz, []);
        await adapter.configure(key, {type: 'memory'});
        this.adapters[key] = adapter;
      } else {
        adapter = Reflect.construct(entry.clazz, []);
        await adapter.configure(key, adapterConfig);
        this.adapters[key] = adapter;
      }

      if (this.options.bins[XS_DEFAULT] == key) {
        this.adapters[XS_DEFAULT] = adapter;
      }
    }

    if (!this.adapters[XS_DEFAULT]) {
      let entry = this.adapterClasses.find(c => c.type == 'memory');
      if (entry) {
        let adapter: ICacheAdapter = Reflect.construct(entry.clazz, []);
        await adapter.configure(XS_DEFAULT, {type: 'memory'});
        this.adapters[XS_DEFAULT] = adapter;
      }
    }

    for (let binKey of _.keys(this.options.bins)) {
      let adapterKey = this.options.bins[binKey];
      if (this.adapters[adapterKey]) {
        this.bins[binKey] = new CacheBin(binKey, this.adapters[adapterKey])
      } else {
        this.bins[binKey] = new CacheBin(binKey, this.adapters[XS_DEFAULT])
      }
    }

    if (!this.bins[XS_DEFAULT]) {
      this.bins[XS_DEFAULT] = new CacheBin(XS_DEFAULT, this.adapters[XS_DEFAULT])
    }
  }


  async register(s: ClassType<ICacheAdapter>) {
    let instance = <ICacheAdapter>Reflect.construct(s, []);
    if (instance && await instance.hasRequirements()) {
      this.adapterClasses.push({
        type: instance.type,
        clazz: s
      })
      return true;
    }
    return false;
  }


  getOptions() {
    return this.options;
  }


  getAdapterClasses() {
    return this.adapterClasses;
  }


  getAdapters() {
    return this.adapters;
  }


  getBins() {
    return this.bins;
  }

  shutdown() {
    let p = [];
    for (let k in this.adapters) {
      p.push(this.adapters[k].shutdown());
    }
    return Promise.all(p);
  }
}
