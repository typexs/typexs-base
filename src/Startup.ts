import {Config} from 'commons-config';
import {EventBus, IEventBusConfiguration} from 'commons-eventbus';
import * as _ from 'lodash';
import {Container, Inject} from 'typedi';
import {IBootstrap} from './api/IBootstrap';
import {IShutdown} from './api/IShutdown';
import {RuntimeLoader} from './base/RuntimeLoader';
import {Cache} from './libs/cache/Cache';
import {ICacheConfig} from './libs/cache/ICacheConfig';
import {C_EVENTBUS, K_CLS_CACHE_ADAPTER, K_CLS_SCHEDULE_ADAPTER_FACTORIES} from './libs/Constants';
import {Log} from './libs/logging/Log';
import {IScheduleDef} from './libs/schedule/IScheduleDef';
import {Scheduler} from './libs/schedule/Scheduler';
import {System} from './libs/system/System';
import {TaskMonitor} from './libs/tasks/TaskMonitor';
import {Tasks} from './libs/tasks/Tasks';
import {TasksHelper} from './libs/tasks/TasksHelper';
import {WatcherRegistry} from './libs/watchers/WatcherRegistry';
import {Workers} from './libs/worker/Workers';


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

  @Inject(WatcherRegistry.NAME)
  watcherRegistry: WatcherRegistry;

  private async schedule() {
    const scheduler: Scheduler = Container.get(Scheduler.NAME);
    await scheduler.prepare(this.loader.getClasses(K_CLS_SCHEDULE_ADAPTER_FACTORIES).map(x => Container.get(x)));
    const schedules: IScheduleDef[] = Config.get('schedules', []);
    if (_.isArray(schedules)) {
      for (const s of schedules) {
        await scheduler.register(s);
      }
    }
  }

  async bootstrap(): Promise<void> {
    await this.schedule();

    TasksHelper.prepare(this.tasks, this.loader);
    await this.workers.prepare(this.loader);

    for (const cls of this.loader.getClasses(K_CLS_CACHE_ADAPTER)) {
      await this.cache.register(<any>cls);
    }
    const cache: ICacheConfig = Config.get('cache');
    await this.cache.configure(this.system.node.nodeId, cache);

    const bus: { [name: string]: IEventBusConfiguration } = Config.get(C_EVENTBUS, false);
    if (bus) {
      for (const name in bus) {
        if (bus.hasOwnProperty(name)) {
          const busCfg: IEventBusConfiguration = bus[name];
          busCfg.name = name;
          const x = EventBus.$().addConfiguration(busCfg);
          // console.log(x);
        }
      }
    }

    await this.watcherRegistry.init();
    await this.watcherRegistry.startAll();
  }


  async ready() {
    await (<TaskMonitor>Container.get(TaskMonitor.NAME)).prepare();
    await this.workers.startup();
    await this.system.register();
    const wait = Config.get('nodes.ready.wait', 500);
    if (wait > 0) {
      Log.debug('wait for node registration feedback ...');
      await new Promise((resolve, reject) => {
        setTimeout(resolve, wait);
      });
    }
  }

  /**
   * impl. shutdown function, shutdowns following components:
   * - cache
   * - distributed system
   * - EventBus
   * - tasks
   * - workers
   * - watchers
   */
  async shutdown() {
    await this.cache.shutdown();
    await this.system.unregister();
    await EventBus.$().shutdown();
    await (<TaskMonitor>Container.get(TaskMonitor.NAME)).finish();
    this.tasks.reset();
    await this.workers.shutdown();
    await this.watcherRegistry.stopAll();
  }

}
