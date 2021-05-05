import {ITasksApi} from './ITasksApi';
import {TaskRunner} from '../libs/tasks/TaskRunner';
import {TaskRun} from '../libs/tasks/TaskRun';


export class TasksApi implements ITasksApi {

  onInit(run: TaskRun | TaskRunner) {
  }

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


  onStartup() {
  }


  onShutdown() {
  }

}
