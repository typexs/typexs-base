import {ITask} from '../../../../src/libs/tasks/ITask';

export class SimpleTaskUngrouped01 implements ITask {
  name: string = 'simple_task_ungrouped_01';

  content: string = 'test';

  exec( done: (err: Error, res: any) => void) {
    done(null, this.content);
  }

}
