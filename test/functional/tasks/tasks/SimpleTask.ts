import {ITask} from '../../../../src/libs/tasks/ITask';

export class SimpleTask implements ITask {
  name: string = 'simple_task';

  content: string = 'test';

  exec( done: (err: Error, res: any) => void) {
    done(null, this.content);
  }

}
