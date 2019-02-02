import {ICacheSetOptions} from "./ICacheOptions";
import {ICacheBinConfig} from "./ICacheBinConfig";

export interface ICacheAdapter {

  readonly type: string;

  name: string;

  options: ICacheBinConfig;

  configure(name: string, options: ICacheBinConfig): void;

  hasRequirements(): boolean;

  get(key: string, bin: string, options: ICacheSetOptions): any;

  set(key: string, value: any, bin: string, options: ICacheSetOptions): any;

  shutdown(): void;

}
