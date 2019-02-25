import {ITask} from "../../../../src";
import {ITaskRuntimeContainer} from "../../../../src/libs/tasks/ITaskRuntimeContainer";
import {Incoming} from "../../../../src/libs/tasks/decorators/Incoming";
import {Outgoing} from "../../../../src/libs/tasks/decorators/Outgoing";
import {TaskRuntime} from "../../../../src/libs/tasks/decorators/TaskRuntime";

export class SimpleTaskWithArgs implements ITask {
  name: string = 'simple_task_with_args';

  @TaskRuntime()
  runtime: ITaskRuntimeContainer;

  @Incoming({type: 'string', optional: false})
  incoming: string;

  @Outgoing({type: 'string'})
  outgoing: string;


  async exec() {
    this.runtime.total(100);
    console.log('doing important stuff ' + this.incoming);
    this.runtime.progress(50);
    this.runtime.progress(100);

    this.outgoing = this.incoming + '-test';

    return this.outgoing;
  }

}
