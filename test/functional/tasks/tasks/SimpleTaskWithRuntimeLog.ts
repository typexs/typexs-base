import {ITask} from "../../../../src";
import {TaskRuntime} from "../../../../src/libs/tasks/decorators/TaskRuntime";
import {ITaskRuntimeContainer} from "../../../../src/libs/tasks/ITaskRuntimeContainer";

export class SimpleTaskWithRuntimeLog implements ITask {

  @TaskRuntime()
  runtime: ITaskRuntimeContainer;

  async exec() {
    let logger = this.runtime.logger();

    logger.info('doing something');
    logger.warn('doing something wrong');
    logger.error('doing something wrong\nnewline');

    return 'test';
  }

}
