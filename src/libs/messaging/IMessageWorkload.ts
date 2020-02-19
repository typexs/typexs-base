import {IQueueWorkload} from '../../libs/queue/IQueueWorkload';
import {AbstractEvent} from './AbstractEvent';

export interface IMessageWorkload extends IQueueWorkload {

  /**
   * Received event
   */
  event: AbstractEvent;

}


