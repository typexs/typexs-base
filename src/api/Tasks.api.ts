import {ITasksApi} from "./ITasksApi";
import {TaskRun, TaskRunner} from "..";


export class TasksApi implements ITasksApi {

  onBefore(runner: TaskRunner) {
  }

  onStart(run: TaskRun) {
  }

  onProgress(run: TaskRun) {
  }

  onStop(run: TaskRun) {
  }

  onAfter(runner: TaskRunner) {
  }

  onError(run: TaskRun | TaskRunner) {
  }


  onInit() {
  }


  onShutdown() {
  }

}
