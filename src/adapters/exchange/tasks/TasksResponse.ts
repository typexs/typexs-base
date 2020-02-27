import {AbstractEvent} from '../../../libs/messaging/AbstractEvent';
import {ITaskRunnerResult} from '../../../libs/tasks/ITaskRunnerResult';
import {TASK_OP} from './Constants';

export class TasksResponse extends AbstractEvent {

  op: TASK_OP;

  logFilePath: string;

  stats: ITaskRunnerResult[];

}
