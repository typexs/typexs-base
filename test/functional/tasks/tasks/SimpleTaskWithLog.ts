import {ITask} from '../../../../src/libs/tasks/ITask';
import {TaskRuntime} from "../../../../src/libs/tasks/decorators/TaskRuntime";
import {ITaskRuntimeContainer} from "../../../../src/libs/tasks/ITaskRuntimeContainer";

export class SimpleTaskWithLog implements ITask {

  @TaskRuntime()
  runtime: ITaskRuntimeContainer;

  async exec() {
    let logger = this.runtime.logger();

    this.runtime.progress(20);

    logger.info('doing something');
    logger.warn('doing something wrong');
    logger.error('doing something wrong\nnewline');

    this.runtime.progress(40);

    return 'test';
  }

}
