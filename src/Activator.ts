import {IActivator} from "./api/IActivator";
import {Tasks} from "./libs/tasks/Tasks";
import {Cache} from "./libs/cache/Cache";
import {Container, Inject} from "typedi";
import {RuntimeLoader} from "./base/RuntimeLoader";
import {Workers} from "./libs/worker/Workers";
import {C_TASKS} from "./libs/tasks/Constants";
import {Config} from "commons-config";
import {C_WORKERS} from "./libs/worker/Constants";
import {Bootstrap} from "./Bootstrap";
import {TaskMonitor} from "./libs/tasks/TaskMonitor";
import {Scheduler} from "./libs/schedule/Scheduler";
import {K_CLS_SCHEDULE_ADAPTER_FACTORIES} from "./libs/Constants";


export class Activator implements IActivator {


  @Inject(RuntimeLoader.NAME)
  loader: RuntimeLoader;


  startup(): void {
    const cache = new Cache();
    Container.set(Cache.NAME, cache);


    //    const system = new System();
//    system.initialize(Bootstrap.getNodeId());
//    Container.set(System.NAME, system);

    const tasks = new Tasks(Bootstrap.getNodeId());
    let cfg = Config.get(C_TASKS, null);
    if (cfg) {
      tasks.setConfig(cfg);
    }
    Container.set(Tasks.NAME, tasks);

    // Schedule init
    const scheduler = Container.get(Scheduler);
    Container.set(Scheduler.NAME, scheduler);


    let taskMonitor = Container.get(TaskMonitor);
    Container.set(TaskMonitor.NAME, taskMonitor);

    const workers = new Workers();
    cfg = Config.get(C_WORKERS, null);
    if (cfg) {
      workers.setConfig(cfg);
    }
    Container.set(Workers.NAME, workers);


  }


}
