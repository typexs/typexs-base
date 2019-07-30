import {ITask} from '../../../../src/libs/tasks/ITask';
import {Outgoing} from '../../../../src/libs/tasks/decorators/Outgoing';

export class DependentTask implements ITask {
  name = 'dependent';


  @Outgoing()
  data: any;


  async exec() {
    this.data = {new: 'data'};
  }

}
