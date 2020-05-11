import {TaskEvent} from '../TaskEvent';

export interface ITaskFutureOptions {

  eventId: string;

  // targetIds: string[];
  filter?: (event: TaskEvent) => boolean;

}
