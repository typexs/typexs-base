import {ICacheBinConfig} from "./ICacheBinConfig";

export interface ICacheConfig {
  bins?: { [key: string]: string }
  adapter?: { [key: string]: ICacheBinConfig }
}
