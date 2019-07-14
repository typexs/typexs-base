import {Incoming, ITask} from '../../../../src';

export class SimpleWorkerTask implements ITask {
  name = 'simple_worker_task';

  @Incoming({optional: true})
  data: string;


  async exec() {
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, 100);
    });
    return 'test';
  }

}
