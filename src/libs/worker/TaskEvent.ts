import {CryptUtils} from "../../libs/utils/CryptUtils";
import {IError} from "../exceptions/IError";
import {ITaskRunnerResult} from "../tasks/ITaskRunnerResult";
import * as _ from 'lodash';

export class TaskEvent {

  static inc = 0;

  /**
   * Id of system node which created the event
   */
  nodeId: string;

  /**
   * Id of target system node
   *
   * Used for direct task allocation
   */
  targetId: string;

  /**
   * Id of responding system node
   */
  respId: string;

  /**
   * Id of event itself
   */
  id: string = CryptUtils.shorthash('task_event-' + (new Date()).getTime() + '' + (TaskEvent.inc++));

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
