// import {Inject} from 'typedi';
// import {UseAPI} from '../decorators/UseAPI';
// import {TasksApi} from '../api/Tasks.api';
// import {ITasksApi} from '../api/ITasksApi';
// import {TaskRunner} from '../libs/tasks/TaskRunner';
// import {TaskRun} from '../libs/tasks/TaskRun';
//
//
// @UseAPI(TasksApi)
// export class TasksStorageExtension implements ITasksApi {
//
//   @Inject(TaskMonitor.NAME)
//   taskMonitorWorker: TaskMonitor;
//
//
//   async onBefore(runner: TaskRunner) {
//     await this._onTaskRun(runner);
//   }
//
//   async onStart(run: TaskRun) {
//     await this._onTaskRun(run);
//   }
//
//   async onProgress(run: TaskRun) {
//     await this._onTaskRun(run);
//   }
//
//   async onStop(run: TaskRun) {
//     await this._onTaskRun(run);
//   }
//
//
//   async onAfter(runner: TaskRunner) {
//     await this._onTaskRun(runner);
//   }
//
//   async onError(runner: TaskRun | TaskRunner) {
//     await this._onTaskRun(runner);
//   }
//
//   async onShutdown() {
//     if (this.taskMonitorWorker) {
//       if (!this.taskMonitorWorker.queue.isIdle()) {
//         await this.taskMonitorWorker.queue.await();
//       }
//     }
//   }
//
//   async _onTaskRun(runner: TaskRun | TaskRunner) {
//     if (this.taskMonitorWorker) {
//       let _runner: TaskRunner;
//       if (runner instanceof TaskRun) {
//         _runner = runner.getRunner();
//       } else {
//         _runner = runner;
//       }
//       const results = _runner.collectStats();
//       this.taskMonitorWorker.onTaskResults(results);
//     }
//   }
//
// }
