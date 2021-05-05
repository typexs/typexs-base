import {TaskRuntime} from '../../../../src/libs/tasks/decorators/TaskRuntime';
import {ITaskRuntimeContainer} from '../../../../src/libs/tasks/ITaskRuntimeContainer';
import {ITask} from '../../../../src/libs/tasks/ITask';

export class SimpleTaskWithRuntimeLog implements ITask {

  @TaskRuntime()
  runtime: ITaskRuntimeContainer;

  async exec() {
    const logger = this.runtime.logger();

    logger.info('doing something');
    logger.warn('doing something wrong');
    logger.error('doing something wrong\nnewline');

    return 'test';
  }

}
