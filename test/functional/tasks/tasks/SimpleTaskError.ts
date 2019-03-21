import {ITask} from "../../../../src";

export class SimpleTaskError implements ITask {
  name: string = 'simple_task_error';

  content: string = 'test';

  exec( done: (err: Error, res: any) => void) {

    throw new Error();

    done(null, this.content);
  }

}
