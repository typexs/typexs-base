import {ITask} from '../../../../src/libs/tasks/ITask';
import {Outgoing} from "../../../../src/libs/tasks/decorators/Outgoing";

export class GroupingTask implements ITask {
  name: string = 'grouping';


  async exec() {
    return this.name
  }

}
