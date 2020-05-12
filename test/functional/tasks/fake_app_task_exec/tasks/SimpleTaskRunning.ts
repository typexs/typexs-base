import {ITask} from '../../../../../src/libs/tasks/ITask';

export class SimpleTaskRunning implements ITask {
  name = 'simple_task_running';

  content = 'test';

  async exec() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {resolve(this.content); }, 2000);
    });
  }

}
