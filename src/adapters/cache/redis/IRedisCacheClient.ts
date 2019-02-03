import {ICacheGetOptions, ICacheSetOptions} from "../../../libs/cache/ICacheOptions";

export interface IRedisCacheClient {

  connect(): Promise<IRedisCacheClient>;

  get(key: string, options?: ICacheGetOptions): Promise<any>;

  set(key: string, value: any, options?: ICacheSetOptions): Promise<any>;

  close(): Promise<any>;

  removeKeysByPattern(prefix: string): Promise<number>;
}

