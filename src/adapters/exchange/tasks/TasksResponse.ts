import {AbstractEvent} from '../../../libs/messaging/AbstractEvent';
import {ITaskRunnerResult} from '../../../libs/tasks/ITaskRunnerResult';
import {TASK_OP} from './Constants';
import {TaskLog} from '../../../entities/TaskLog';
import {ITaskRunnerStatus} from '../../../libs/tasks/ITaskRunnerStatus';

export class TasksResponse extends AbstractEvent {

  op: TASK_OP;

  logFilePath: string;

  logFileContent: string;

  stats: ITaskRunnerResult[];

  taskLog: TaskLog;

  runningStatuses: ITaskRunnerStatus[];

}
