import {ITaskRuntimeContainer} from "./ITaskRuntimeContainer";

export interface ITask {

  name: string;

  runtime?: ITaskRuntimeContainer;

  exec(done: (err: Error, res: any) => void): void;
}
