import {IError} from "../../exceptions/IError";
import {ITaskRunnerResult} from "../../tasks/ITaskRunnerResult";
import * as _ from 'lodash';
import {AbstractEvent} from "../../events/AbstractEvent";

export class TaskEvent extends AbstractEvent {

  /**
   * Name or names of task(s) to execute
   */
  name: string | string[];

  /**
   * arguments to pass to task runner
   */
  parameters?: { [name: string]: any };

  /**
   * errors
   */
  errors: IError[] = [];


  /**
   * current state of task
   */
  state: 'enqueue' | 'proposed' | 'started' | 'stopped' | 'running' | 'errored' = 'proposed';

  /**
   * Topic of this event
   */
  topic: 'data' | 'log' = 'data';

  /**
   * log data
   */
  log: any[];

  data: ITaskRunnerResult;


  addParameter(key: string, value: any) {
    if (!this.parameters) {
      this.parameters = {};
    }
    this.parameters[_.snakeCase(key)] = value;
  }

}
