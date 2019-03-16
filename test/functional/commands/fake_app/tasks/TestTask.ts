import {ITask} from "../../../../../src";

export class TestTask implements ITask{
  name: string = 'test';

  async exec(done: Function) {
    done(null, {res: 'okay'});
  }
}
