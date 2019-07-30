import {ITask} from '../../../../src/libs/tasks/ITask';
import {ITaskRuntimeContainer} from '../../../../src/libs/tasks/ITaskRuntimeContainer';
import {Incoming} from '../../../../src/libs/tasks/decorators/Incoming';
import {TaskRuntime} from '../../../../src/libs/tasks/decorators/TaskRuntime';

export class SimpleTaskWithDefaultArgs implements ITask {
  name = 'simple_task_with_default_args';

  @TaskRuntime()
  runtime: ITaskRuntimeContainer;

  @Incoming()
  value = 'SomeValue';

  @Incoming({default: ['asd', 'bfr']})
  list: string[];


  async exec() {
    return '';
  }

}
