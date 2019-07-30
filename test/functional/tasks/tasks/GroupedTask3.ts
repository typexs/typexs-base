import {ITask} from '../../../../src/libs/tasks/ITask';
import {Outgoing} from "../../../../src/libs/tasks/decorators/Outgoing";

export class GroupedTask3 implements ITask {
  name: string = 'grouped_3';

  groups: string[] = ['grouping'];


  async exec() {
    return this.name
  }

}
