import {ITask} from "../../../../src";
import {ITaskRuntimeContainer} from "../../../../src/libs/tasks/ITaskRuntimeContainer";

export class SimpleTask implements ITask {
  name: string = 'simple_task';

  runtime:ITaskRuntimeContainer;

  content: string = 'test';

  exec( done: (err: Error, res: any) => void) {
    this.runtime.total(100);
    console.log('doing important stuff ' + this.content);
    this.runtime.progress(50);
    this.runtime.progress(100);
    done(null, this.content);
  }

}
