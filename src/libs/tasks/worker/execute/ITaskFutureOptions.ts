import {TaskEvent} from '../TaskEvent';

export interface ITaskFutureOptions {

  /**
   * Event id for fired task events
   */
  eventId: string;

  /**
   * Method to filter by task fired events, which should
   * be cached in the future for further process.
   *
   * @param event
   */
  filter?: (event: TaskEvent) => boolean;

}
