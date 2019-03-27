import {ITask} from "../../../../src";
import {Outgoing} from "../../../../src/libs/tasks/decorators/Outgoing";

export class SimpleWorkerTask implements ITask {
  name: string = 'simple_worker_task';


  async exec() {
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, 100)
    });
    return 'test';
  }

}
