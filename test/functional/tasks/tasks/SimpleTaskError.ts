import {ITask} from '../../../../src';

export class SimpleTaskError implements ITask {
  name = 'simple_task_error';

  content = 'test';

  exec( done: (err: Error, res: any) => void) {

    throw new Error();

    done(null, this.content);
  }

}
