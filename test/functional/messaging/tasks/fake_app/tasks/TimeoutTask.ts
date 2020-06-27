import {ITask} from '../../../../../../src/libs/tasks/ITask';
import {Incoming} from '../../../../../../src/libs/tasks/decorators/Incoming';


export class TimeoutTask implements ITask {
  name = 'timeout_task';

  content = 'test';

  @Incoming({optional: true})
  timeout: number = 1000;

  async exec() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(this.content);
      }, this.timeout);
    });
  }

}
