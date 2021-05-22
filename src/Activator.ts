import {defaults} from 'lodash';
import {Config} from '@allgemein/config';
import {IActivator} from './api/IActivator';
import {Bootstrap} from './Bootstrap';
import {Cache} from './libs/cache/Cache';
import {Scheduler} from './libs/schedule/Scheduler';
import {C_TASKS} from './libs/tasks/Constants';
import {Tasks} from './libs/tasks/Tasks';
import {WatcherRegistry} from './libs/watchers/WatcherRegistry';
import {C_WORKERS} from './libs/worker/Constants';
import {Workers} from './libs/worker/Workers';
import {TaskRunnerRegistry} from './libs/tasks/TaskRunnerRegistry';
import {ExchangeMessageRegistry} from './libs/messaging/ExchangeMessageRegistry';
import {C_EXCHANGE_MESSAGE} from './libs/messaging/Constants';
import {Injector} from './libs/di/Injector';
import {MetadataRegistry, RegistryFactory} from '@allgemein/schema-api';
import {CONFIG_SCHEMA} from './config.schema';


export class Activator implements IActivator {

  configSchema(): any {
    return CONFIG_SCHEMA;
  }

  startup(): void {
    MetadataRegistry.$().setMaxListeners(1000);

    const cache = new Cache();
    Injector.set(Cache.NAME, cache);


    /**
     * Initialize task registry
     */
    RegistryFactory.register(C_TASKS, Tasks);
    const tasks = RegistryFactory.get(C_TASKS) as Tasks;
    let cfg = Config.get(C_TASKS, {});
    defaults(cfg, {nodeId: Bootstrap.getNodeId()});
    if (cfg) {
      tasks.setConfig(cfg);
    }
    Injector.set(Tasks.NAME, tasks);
    const taskRunnerRegistry = Injector.create(TaskRunnerRegistry);
    Injector.set(TaskRunnerRegistry.NAME, taskRunnerRegistry);


    // Schedule init
    const scheduler = Injector.get(Scheduler);
    Injector.set(Scheduler.NAME, scheduler);

    /**
     * Initialize worker registry
     */
    RegistryFactory.register(C_WORKERS, Workers);
    const workers = RegistryFactory.get(C_WORKERS) as Workers;
    cfg = Config.get(C_WORKERS, null);
    if (cfg) {
      workers.setConfig(cfg);
    }
    Injector.set(Workers.NAME, workers);

    /**
     * Initialize exchange worker registry
     */
    RegistryFactory.register(C_EXCHANGE_MESSAGE, ExchangeMessageRegistry);
    const exchange = RegistryFactory.get(C_EXCHANGE_MESSAGE) as ExchangeMessageRegistry;
    cfg = Config.get(C_EXCHANGE_MESSAGE, null);
    if (cfg) {
      exchange.setConfig(cfg);
    }
    Injector.set(ExchangeMessageRegistry.NAME, exchange);

    /**
     * Initialize watcher registry
     */
    Injector.set(WatcherRegistry.NAME, new WatcherRegistry());
  }


}
