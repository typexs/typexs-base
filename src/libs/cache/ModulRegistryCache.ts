import {ICache} from 'commons-moduls/registry/ICache';
import {Cache} from './Cache';
import {NotYetImplementedError} from 'commons-base';

export interface IModulRegistryCache {

  ttl?: number;

}

export class ModulRegistryCache implements ICache {

  private cacheBin = 'modul_registry';

  private cache: Cache;

  constructor(cache: Cache) {
    this.cache = cache;
  }

  get(key: string) {
    return this.cache.get(key, this.cacheBin);
  }

  async set(key: string, value: any) {
    await this.cache.set(key, value, this.cacheBin, {});
  }

  clear(): void {
    throw new NotYetImplementedError();
  }

}
