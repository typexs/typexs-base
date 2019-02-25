import {ITask} from "../../../../src";
import {ITaskRuntimeContainer} from "../../../../src/libs/tasks/ITaskRuntimeContainer";

export class SimpleTaskPromise implements ITask {
  name: string = 'simple_task_promise';

  runtime: ITaskRuntimeContainer;

  content: string = 'test';

  async exec() {
    this.runtime.total(100);
    console.log('doing important stuff ' + this.content);
    this.runtime.progress(50);
    this.runtime.progress(100);
    return this.content;
  }

}
