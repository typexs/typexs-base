import {ITask} from '../../../../src/libs/tasks/ITask';
import {Outgoing} from '../../../../src/libs/tasks/decorators/Outgoing';

export class GroupedTask1 implements ITask {
  name = 'grouped_1';

  groups: string[] = ['grouped'];


  async exec() {
    return this.name;
  }

}
