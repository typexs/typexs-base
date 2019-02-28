import {CryptUtils} from "../../libs/utils/CryptUtils";
import {IError} from "../exceptions/IError";
import {ITaskRunnerResult} from "../tasks/ITaskRunnerResult";

export class TaskEvent {

  static inc = 0;

  /**
   * Id of system node which created the event
   */
  nodeId: string;

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
  parameters?: any;

  /**
   * errors
   */
  errors: IError[] = [];


  /**
   * current state of task
   */
  state: 'enqueue' | 'proposed' | 'started' | 'stopped' | 'running' | 'errored' = 'proposed';


  data: ITaskRunnerResult;


}
