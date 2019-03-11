import {TaskWorkerQueue} from "../libs/worker/TaskWorkerQueue";
import {Container} from "typedi";


export class TaskWorkerCommand {

  command = "task-worker";

  aliases = "tw";

  describe = "Handle tasks in worker";

  builder(yargs: any) {
    return yargs
  }


  async handler(argv: any) {
    const worker = <TaskWorkerQueue>Container.get(TaskWorkerQueue);
    await worker.prepare();

  }

}

