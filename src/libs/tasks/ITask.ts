import {ITaskInfo} from './ITaskInfo';

export interface ITask extends ITaskInfo {

  exec(done?: (err: Error, res: any) => void): void;

}
