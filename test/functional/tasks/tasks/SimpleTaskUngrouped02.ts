import {ITask} from '../../../../src/libs/tasks/ITask';

export class SimpleTaskUngrouped02 implements ITask {
  name: string = 'simple_task_ungrouped_02';

  content: string = 'test';

  exec( done: (err: Error, res: any) => void) {
    done(null, this.content);
  }

}
