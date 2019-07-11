import {Incoming, ITask} from '../../../../src';
import {TaskRuntime} from '../../../../src/libs/tasks/decorators/TaskRuntime';
import {ITaskRuntimeContainer} from '../../../../src/libs/tasks/ITaskRuntimeContainer';

export class SimpleTaskStartingOtherTask implements ITask {

  @TaskRuntime()
  runtime: ITaskRuntimeContainer;

  async exec() {
    const logger = this.runtime.logger();
    try {
      logger.info('doing something');
      logger.warn('doing something wrong');
      const p = await this.runtime.addTask('simple_other_task', {value: SimpleTaskStartingOtherTask.name});
      logger.debug(p.name);
    } catch (e) {
      logger.error(e);
    }
    return 'test';
  }

}


export class SimpleOtherTask implements ITask {

  @TaskRuntime()
  runtime: ITaskRuntimeContainer;

  @Incoming()
  value: string;

  async exec() {
    const logger = this.runtime.logger();


    logger.info('doing something');
    logger.warn('doing something wrong');

    return 'test';
  }

}
