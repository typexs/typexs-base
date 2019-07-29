import {IError} from '../../exceptions/IError';
import {ITaskRunnerResult} from '../../tasks/ITaskRunnerResult';
import * as _ from 'lodash';
import {AbstractEvent} from '../../events/AbstractEvent';
import {IQueueWorkload} from '../../../libs/queue/IQueueWorkload';
import {TASK_RUNNER_SPEC, TASK_STATES} from '../Constants';
import * as moment from 'moment';

/**
 * Id is the runner id
 */
export class TaskEvent extends AbstractEvent implements IQueueWorkload {

  /**
   * Name or names of task(s) to execute
   */
  taskSpec: TASK_RUNNER_SPEC | TASK_RUNNER_SPEC[];

  /**
   * Arguments to pass to task runner
   */
  parameters?: { [name: string]: any };

  /**
   * Errors
   */
  errors: IError[] = [];

  /**
   * Current state of task
   */
  state: TASK_STATES = 'proposed';

  /**
   * Topic of this event
   */
  topic: 'data' | 'log' = 'data';

  /**
   * log data
   */
  log: any[];


  data: ITaskRunnerResult;


  constructor() {
    super();
    const dateStr = moment(new Date()).format('YYYYMMDD-HHmmssSSS');
    this.id = dateStr + '-' + this.id;
  }

  addParameter(key: string, value: any) {
    if (!this.parameters) {
      this.parameters = {};
    }
    this.parameters[_.snakeCase(key)] = value;
  }

}
