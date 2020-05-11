import {ITask} from '../../../../../src/libs/tasks/ITask';

export class SimpleTaskPromise implements ITask {
  name = 'simple_task_promise';

  content = 'test';

  async exec() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {resolve(this.content); }, 100);
    });
  }

}
