import {ITask} from "../../../../src";
import {Outgoing} from "../../../../src/libs/tasks/decorators/Outgoing";

export class GroupedTask2 implements ITask {

  name: string = 'grouped_2';

  groups: string[] = ['grouped'];


  async exec() {
    return this.name
  }

}
