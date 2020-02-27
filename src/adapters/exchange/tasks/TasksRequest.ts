import {AbstractEvent} from '../../../libs/messaging/AbstractEvent';
import {TASK_OP} from './Constants';

export class TasksRequest extends AbstractEvent {

  op: TASK_OP;

  runnerId: string;

}
