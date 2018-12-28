import {IBootstrap} from "./api/IBootstrap";
import {Inject} from "typedi";
import {RuntimeLoader} from "./base/RuntimeLoader";
import {Tasks} from "./libs/tasks/Tasks";


export class Startup implements IBootstrap {

  @Inject(Tasks.NAME)
  tasks: Tasks;

  @Inject(RuntimeLoader.NAME)
  loader: RuntimeLoader;

  bootstrap(): void {
    this.tasks.prepare(this.loader);
  }


}
