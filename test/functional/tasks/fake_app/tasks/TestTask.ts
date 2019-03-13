import {ITask} from "../../../../../src";
import {Incoming} from "../../../../../src/libs/tasks/decorators/Incoming";

export class TestTask implements ITask {

  name: string = 'test';

  description: string = 'Hallo welt';

  @Incoming()
  someValue: string;

  async exec(done: Function) {
    done(null, {res: 'okay', value: this.someValue});
  }
}
