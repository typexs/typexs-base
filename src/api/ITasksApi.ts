import {TaskRunner} from '../libs/tasks/TaskRunner';
import {TaskRun} from '../libs/tasks/TaskRun';


export interface ITasksApi {

  onStartup?(): void;

  onShutdown?(): void;

  onInit?(run: TaskRun | TaskRunner): void;

  onBefore?(runner: TaskRunner): void;

  onStart?(run: TaskRun): void;

  onProgress?(run: TaskRun): void;

  onStop?(run: TaskRun): void;

  onAfter?(runner: TaskRunner): void;

  onError?(run: TaskRun | TaskRunner): void;

}
