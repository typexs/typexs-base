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
import {defaultsDeep, isPlainObject, keys} from 'lodash';
import {ICacheAdapter} from './ICacheAdapter';
import {ClassType} from '@allgemein/schema-api';
import {ICacheConfig} from './ICacheConfig';
import {ICacheGetOptions, ICacheSetOptions} from './ICacheOptions';
import {CacheBin} from './CacheBin';
import {C_DEFAULT} from '@allgemein/base';
import {CACHE_NAME, ICache} from './ICache';


export const DEFAULT_OPTIONS: ICacheConfig = {

  bins: {
    default: 'default'
  }

};

export class Cache implements ICache {

  static NAME = CACHE_NAME;

  private options: ICacheConfig = DEFAULT_OPTIONS;

  private adapterClasses: { type: string, clazz: ClassType<ICacheAdapter> }[] = [];

  private adapters: { [k: string]: ICacheAdapter } = {};

  private bins: { [k: string]: CacheBin } = {};

  private nodeId: string;

  getBin(name: string) {
    if (this.bins[name]) {
      return this.bins[name];
    }
    return this.bins[C_DEFAULT];
  }


  async get<T>(key: string, bin: string = C_DEFAULT, options?: ICacheGetOptions): Promise<T> {
    const cacheBin = this.getBin(bin);
    return cacheBin.get(key, bin, options);
  }


  async set<T>(key: string, value: T, bin: string = C_DEFAULT, options?: ICacheSetOptions): Promise<T> {
    const cacheBin = this.getBin(bin);
    return cacheBin.set(key, value, bin, options);
  }


  async configure(nodeId: string, config?: ICacheConfig) {
    this.nodeId = nodeId;
    if (config && isPlainObject(config)) {
      defaultsDeep(config || {}, DEFAULT_OPTIONS);
      this.options = config;
    }


    for (const key of keys(this.options.adapter)) {
      const adapterConfig = this.options.adapter[key];
      let entry = this.adapterClasses.find(c => c.type === adapterConfig.type);
      let adapter: ICacheAdapter = null;
      if (!entry) {
        entry = this.adapterClasses.find(c => c.type === 'memory');
        adapter = Reflect.construct(entry.clazz, []);
        await adapter.configure(key, {type: 'memory', nodeId: nodeId});
        this.adapters[key] = adapter;
      } else {
        adapter = Reflect.construct(entry.clazz, []);
        await adapter.configure(key, adapterConfig);
        this.adapters[key] = adapter;
      }

      if (this.options.bins[C_DEFAULT] === key) {
        this.adapters[C_DEFAULT] = adapter;
      }
    }

    if (!this.adapters[C_DEFAULT]) {
      const entry = this.adapterClasses.find(c => c.type === 'memory');
      if (entry) {
        const adapter: ICacheAdapter = Reflect.construct(entry.clazz, []);
        await adapter.configure(C_DEFAULT, {type: 'memory', nodeId: nodeId});
        this.adapters[C_DEFAULT] = adapter;
      }
    }

    for (const binKey of keys(this.options.bins)) {
      const adapterKey = this.options.bins[binKey];
      if (this.adapters[adapterKey]) {
        this.bins[binKey] = new CacheBin(binKey, this.adapters[adapterKey]);
      } else {
        this.bins[binKey] = new CacheBin(binKey, this.adapters[C_DEFAULT]);
      }
    }

    if (!this.bins[C_DEFAULT]) {
      this.bins[C_DEFAULT] = new CacheBin(C_DEFAULT, this.adapters[C_DEFAULT]);
    }
  }


  async register(s: ClassType<ICacheAdapter>) {
    const instance = <ICacheAdapter>Reflect.construct(s, []);
    if (instance && await instance.hasRequirements()) {
      this.adapterClasses.push({
        type: instance.type,
        clazz: s
      });
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
    const p = [];
    for (const k in this.adapters) {
      if (this.adapters.hasOwnProperty(k)) {
        p.push(this.adapters[k].shutdown());
      }
    }
    return Promise.all(p);
  }
}
