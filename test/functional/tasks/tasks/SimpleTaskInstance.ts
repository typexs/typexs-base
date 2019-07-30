import {ITask} from '../../../../src/libs/tasks/ITask';

export class SimpleTaskInstance implements ITask {
  name: string = 'simple_task_instance';

  content: string = 'test';

  exec( done: (err: Error, res: any) => void) {
    done(null, this.content);
  }

}
