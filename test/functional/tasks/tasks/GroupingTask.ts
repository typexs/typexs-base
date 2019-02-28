import {ITask} from "../../../../src";
import {Outgoing} from "../../../../src/libs/tasks/decorators/Outgoing";

export class GroupingTask implements ITask {
  name: string = 'grouping';


  async exec() {
    return this.name
  }

}
