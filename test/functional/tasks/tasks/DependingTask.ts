import {ITask} from "../../../../src";
import {Incoming} from "../../../../src/libs/tasks/decorators/Incoming";

export class DependingTask implements ITask {
  name: string = 'depending';


  @Incoming({name:'data'})
  fromDependent: any;



  async exec() {
    this.fromDependent.test = 'true';
    return this.fromDependent;
  }


}
