import {TaskState} from "../libs/tasks/TaskState";


export interface ITasksApi {

  onShutdown(): void;

  onStart?(state: TaskState): void;

  onProgress?(state: TaskState): void;

  onStop?(state: TaskState): void;

  onError?(state: TaskState): void;

}
