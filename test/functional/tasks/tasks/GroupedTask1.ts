import {ITask} from "../../../../src";
import {Outgoing} from "../../../../src/libs/tasks/decorators/Outgoing";

export class GroupedTask1 implements ITask {
  name: string = 'grouped_1';

  groups: string[] = ['grouped'];


  async exec() {
    return this.name
  }

}
