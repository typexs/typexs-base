import {Config} from 'commons-config';
import {Container, Inject} from 'typedi';
import {IActivator} from './api/IActivator';
import {RuntimeLoader} from './base/RuntimeLoader';
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

export class Activator implements IActivator {


  // @Inject(RuntimeLoader.NAME)
  // loader: RuntimeLoader;


  startup(): void {

    /**
     * Initialize task content
     */
    const tasks = new Tasks(Bootstrap.getNodeId());
    let cfg = Config.get(C_TASKS, null);
    if (cfg) {
      tasks.setConfig(cfg);
    }
    Container.set(Tasks.NAME, tasks);
    const taskRunnerRegistry = Injector.create(TaskRunnerRegistry);
    Container.set(TaskRunnerRegistry.NAME, taskRunnerRegistry);


    // Schedule init
    const scheduler = Container.get(Scheduler);
    Container.set(Scheduler.NAME, scheduler);


    const workers = new Workers();
    cfg = Config.get(C_WORKERS, null);
    if (cfg) {
      workers.setConfig(cfg);
    }
    Container.set(Workers.NAME, workers);

    const exchange = new ExchangeMessageRegistry();
    cfg = Config.get(C_EXCHANGE_MESSAGE, null);
    if (cfg) {
      exchange.setConfig(cfg);
    }
    Container.set(ExchangeMessageRegistry.NAME, exchange);

    Container.set(WatcherRegistry.NAME, new WatcherRegistry());
  }


}
