import {AbstractEvent} from '../../libs/messaging/AbstractEvent';
import {TASK_STATES} from './Constants';
import {ITaskRunnerStatus} from './ITaskRunnerStatus';

export class TaskRunnerEvent extends AbstractEvent implements ITaskRunnerStatus {

  /**
   * Intern task runner number
   */
  nr: number;

  /**
   * Runner states
   */
  state: TASK_STATES = 'proposed';

  /**
   * all task names
   */
  taskNames: string[] = [];

  /**
   * running tasknames
   */
  running: string[] = [];

  /**
   * running tasknames
   */
  finished: string[] = [];

  /**
   * started
   */
  started: Date;

  /**
   * stopped
   */
  stopped: Date;
}
