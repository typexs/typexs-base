import {ITasksApi} from "./ITasksApi";
import {TaskState} from "../libs/tasks/TaskState";


export class TasksApi implements ITasksApi {

  onShutdown(): void {
  }

  onStart(state: TaskState): void {
  }

  onProgress(state: TaskState): void{

  }

  onStop(state: TaskState): void{

  }

  onError(state: TaskState): void{

  }

}
