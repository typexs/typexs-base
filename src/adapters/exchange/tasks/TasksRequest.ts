import {AbstractEvent} from '../../../libs/messaging/AbstractEvent';
import {TASK_OP} from './Constants';
import {IFileOptions, IFileSelectOptions} from '../filesystem/IFileOptions';

export class TasksRequest extends AbstractEvent {

  op: TASK_OP;

  runnerId: string;

  relative: boolean;

  fileOptions: IFileSelectOptions;

}
