import {ICacheGetOptions, ICacheSetOptions} from './ICacheOptions';

export const CACHE_NAME = 'Cache';

export interface ICache {

  get<T>(key: string, bin?: string, options?: ICacheGetOptions): Promise<T>;

  set<T>(key: string, value: any, bin?: string, options?: ICacheSetOptions): Promise<T>;

}
