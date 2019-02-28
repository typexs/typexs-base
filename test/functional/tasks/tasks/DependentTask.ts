import {ITask} from "../../../../src";
import {Outgoing} from "../../../../src/libs/tasks/decorators/Outgoing";

export class DependentTask implements ITask {
  name: string = 'dependent';


  @Outgoing()
  data: any;


  async exec() {
    this.data = {new: 'data'};
  }

}
