import {IActivator} from "./api/IActivator";
import {Tasks} from "./libs/tasks/Tasks";
import {Cache} from "./libs/cache/Cache";
import {Container, Inject} from "typedi";
import {RuntimeLoader} from "./base/RuntimeLoader";
import {Workers} from "./libs/worker/Workers";
import {C_TASKS} from "./libs/tasks/Constants";
import {Config} from "commons-config";
import {C_WORKERS} from "./libs/worker/Constants";


export class Activator implements IActivator {


  @Inject(RuntimeLoader.NAME)
  loader: RuntimeLoader;


  startup(): void {
//    const system = new System();
//    system.initialize(Bootstrap.getNodeId());
//    Container.set(System.NAME, system);

    const tasks = new Tasks();
    let cfg = Config.get(C_TASKS, null);
    if (cfg) {
      tasks.setConfig(cfg);
    }
    Container.set(Tasks.NAME, tasks);

    const cache = new Cache();
    Container.set(Cache.NAME, cache);

    const workers = new Workers();
    cfg = Config.get(C_WORKERS, null);
    if (cfg) {
      workers.setConfig(cfg);
    }
    Container.set(Workers.NAME, workers);


  }


}
