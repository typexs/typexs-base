import {ITask} from '../../../../src/libs/tasks/ITask';
import {TaskRuntime} from "../../../../src/libs/tasks/decorators/TaskRuntime";
import {ITaskRuntimeContainer} from "../../../../src/libs/tasks/ITaskRuntimeContainer";

export class SimpleTaskNoName implements ITask {

  @TaskRuntime()
  runtime: ITaskRuntimeContainer;

  exec( done: (err: Error, res: any) => void) {
    done(null, 'test');
  }

}
