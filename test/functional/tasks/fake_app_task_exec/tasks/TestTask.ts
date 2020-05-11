import {Incoming} from '../../../../../src/libs/tasks/decorators/Incoming';
import {ITask} from '../../../../../src/libs/tasks/ITask';

export class TestTask implements ITask {

  name = 'test';

  description = 'Hallo welt';

  @Incoming()
  someValue: string;

  async exec(done: Function) {
    done(null, {res: 'okay', value: this.someValue});
  }
}
