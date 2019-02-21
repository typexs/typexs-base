
import {TaskWorkerQueue} from "../libs/worker/TaskWorkerQueue";
import {Log} from '../libs/logging/Log'
import {Container, Inject} from "typedi";


export class WorkerCommand{

  command = "worker";

  aliases = "w";

  describe = "handles worker";


  builder(yargs: any) {
    return yargs
  }


  handler(argv: any) {

    const worker = <TaskWorkerQueue>Container.get(TaskWorkerQueue);
    worker.prepare();




  }

}

