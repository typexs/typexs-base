import {IBootstrap} from "./api/IBootstrap";
import {Inject} from "typedi";
import {RuntimeLoader} from "./base/RuntimeLoader";
import {Tasks} from "./libs/tasks/Tasks";
import {Cache} from "./libs/cache/Cache";
import {K_CLS_CACHE_ADAPTER} from "./libs/Constants";
import {Config} from "commons-config";
import {ICacheConfig} from "./libs/cache/ICacheConfig";
import {IShutdown} from "./api/IShutdown";


export class Startup implements IBootstrap, IShutdown {

  @Inject(Tasks.NAME)
  tasks: Tasks;

  @Inject(Cache.NAME)
  cache: Cache;

  @Inject(RuntimeLoader.NAME)
  loader: RuntimeLoader;

  async bootstrap(): Promise<void> {
    this.tasks.prepare(this.loader);

    for (let cls of this.loader.getClasses(K_CLS_CACHE_ADAPTER)) {
      await this.cache.register(<any>cls);
    }
    let cache: ICacheConfig = Config.get('cache');
    await this.cache.configure(cache);

  }

  async shutdown() {
    await this.cache.shutdown();
  }
}
