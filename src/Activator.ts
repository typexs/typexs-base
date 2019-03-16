import {IActivator} from "./api/IActivator";
import {Tasks} from "./libs/tasks/Tasks";
import {Cache} from "./libs/cache/Cache";
import {Container, Inject} from "typedi";
import {RuntimeLoader} from "./base/RuntimeLoader";
import {IPermissions} from "./api/IPermissions";
import {System} from "./libs/system/System";
import {Bootstrap} from "./Bootstrap";


export class Activator implements IActivator {


  @Inject(RuntimeLoader.NAME)
  loader: RuntimeLoader;


  startup(): void {
//    const system = new System();
//    system.initialize(Bootstrap.getNodeId());
//    Container.set(System.NAME, system);

    const tasks = new Tasks();
    Container.set(Tasks.NAME, tasks);

    const cache = new Cache();
    Container.set(Cache.NAME, cache);


  }


}
