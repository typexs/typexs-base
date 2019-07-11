import {TaskEvent} from './TaskEvent';
import {IQueueWorkload} from '../../queue/IQueueWorkload';

export interface ITaskWorkload extends IQueueWorkload {

  /**
   * reuse event object
   */
  event: TaskEvent;

  /**
   * Names of the taskRef's to run
   */
  names: string[];

  /**
   * Arguments for task execution
   */
  parameters?: any;


}
