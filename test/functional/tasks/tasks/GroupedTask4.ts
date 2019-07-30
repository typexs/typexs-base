import {ITask} from '../../../../src/libs/tasks/ITask';
import {Outgoing} from "../../../../src/libs/tasks/decorators/Outgoing";

export class GroupedTask4 implements ITask {
  name: string = 'grouped_4';

  groups: string[] = ['grouping'];


  async exec() {
    return this.name
  }

}
