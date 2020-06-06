import {ICache} from 'commons-moduls/registry/ICache';
import {FileUtils, NotYetImplementedError, PlatformUtils} from 'commons-base';

export interface IModulRegistryCache {

  ttl?: number;

}

export class ModulRegistryCache implements ICache {

  private cachePath: string;

  private data: any;

  constructor(path: string, nodeId: string) {
    path = PlatformUtils.join(path, '.txs', 'cache', nodeId);
    this.cachePath = PlatformUtils.pathNormAndResolve(path);
    if (!PlatformUtils.fileExist(this.cachePath)) {
      PlatformUtils.mkdir(this.cachePath);
    }
  }

  get(key: string) {
    const path = PlatformUtils.join(this.cachePath, key) + '.json';
    if (PlatformUtils.fileExist(path)) {
      return FileUtils.getJson(path);
    }
    return null;
  }

  async set(key: string, value: any) {
    const path = PlatformUtils.join(this.cachePath, key) + '.json';
    await FileUtils.writeFileSync(path, JSON.stringify(value));
  }

  clear(): void {
    throw new NotYetImplementedError();
  }

}
