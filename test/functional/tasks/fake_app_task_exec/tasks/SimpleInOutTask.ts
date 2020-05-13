import {ITask} from '../../../../../src/libs/tasks/ITask';
import {Incoming, Outgoing} from '../../../../../src';

export class SimpleInOutTask implements ITask {
  name = 'simple_in_out_task';

  content = 'test';

  @Incoming()
  income: string;

  @Outgoing()
  output: string;

  async exec() {
    this.output = this.income.repeat(3).trim();
  }

}
