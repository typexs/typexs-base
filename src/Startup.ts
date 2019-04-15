import {IBootstrap} from "./api/IBootstrap";
import {Container, Inject} from "typedi";
import {RuntimeLoader} from "./base/RuntimeLoader";
import {Tasks} from "./libs/tasks/Tasks";
import {Cache} from "./libs/cache/Cache";
import {C_EVENTBUS, K_CLS_CACHE_ADAPTER} from "./libs/Constants";
import {Config} from "commons-config";
import {ICacheConfig} from "./libs/cache/ICacheConfig";
import {IShutdown} from "./api/IShutdown";
import {System} from "./libs/system/System";
import {EventBus, IEventBusConfiguration} from "commons-eventbus";
import {Workers} from "./libs/worker/Workers";
import {TasksHelper} from "./libs/tasks/TasksHelper";
import {TaskMonitor} from "./libs/tasks/TaskMonitor";


export class Startup implements IBootstrap, IShutdown {

  @Inject(Tasks.NAME)
  tasks: Tasks;

  @Inject(Cache.NAME)
  cache: Cache;

  @Inject(RuntimeLoader.NAME)
  loader: RuntimeLoader;

  @Inject(System.NAME)
  system: System;


  @Inject(Workers.NAME)
  workers: Workers;

  async bootstrap(): Promise<void> {
    TasksHelper.prepare(this.tasks, this.loader);


    await this.workers.prepare(this.loader);

    for (let cls of this.loader.getClasses(K_CLS_CACHE_ADAPTER)) {
      await this.cache.register(<any>cls);
    }
    let cache: ICacheConfig = Config.get('cache');
    await this.cache.configure(this.system.node.nodeId, cache);

    let bus: { [name: string]: IEventBusConfiguration } = Config.get(C_EVENTBUS, false);
    if (bus) {
      for (let name in bus) {
        let busCfg: IEventBusConfiguration = bus[name];
        busCfg.name = name;
        let x = EventBus.$().addConfiguration(busCfg);
        //console.log(x);
      }
    }
  }

  async ready() {
    await (<TaskMonitor>Container.get(TaskMonitor.NAME)).prepare();
    await this.workers.startup();
    await this.system.register();

  }


  async shutdown() {
    await this.cache.shutdown();
    await this.system.unregister();
    await EventBus.$().shutdown();
    await (<TaskMonitor>Container.get(TaskMonitor.NAME)).finish();
    this.tasks.reset();
    await this.workers.shutdown();

  }
}
