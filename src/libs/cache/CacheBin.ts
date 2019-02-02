import {ICacheAdapter} from "./ICacheAdapter";
import {ICacheGetOptions, ICacheSetOptions} from "./ICacheOptions";

export class CacheBin {
  readonly name: string;

  readonly store: ICacheAdapter;

  constructor(name: string, adapter: ICacheAdapter) {
    this.name = name;
    this.store = adapter;
  }


  async get(key: string, options?: ICacheGetOptions) {
    return this.store.get(key, this.name, options);
  }

  async set(key: string, value: any, options?: ICacheSetOptions) {
    return this.store.set(key, value, this.name, options);
  }
}
