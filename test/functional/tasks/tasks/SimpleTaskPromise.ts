import {ITask} from "../../../../src";
import {ITaskRuntimeContainer} from "../../../../src/libs/tasks/ITaskRuntimeContainer";

export class SimpleTaskPromise implements ITask {
  name: string = 'simple_task_promise';

  content: string = 'test';

  async exec() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {resolve(this.content)},100);
    });
  }

}
