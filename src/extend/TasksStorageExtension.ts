import {ITasksApi, Log, TaskRun, TaskRunner, TasksApi, UseAPI} from "..";
import {Inject} from "typedi";
import {TaskMonitor} from "../libs/tasks/TaskMonitor";


@UseAPI(TasksApi)
export class TasksStorageExtension implements ITasksApi {

  @Inject(TaskMonitor.NAME)
  taskMonitorWorker: TaskMonitor;


  async onBefore(runner: TaskRunner) {
    await this._onTaskRun(runner);
  }

  async onStart(run: TaskRun) {
    await this._onTaskRun(run);
  }

  async onProgress(run: TaskRun) {
    await this._onTaskRun(run);
  }

  async onStop(run: TaskRun) {
    await this._onTaskRun(run);
  }


  async onAfter(runner: TaskRunner) {
    await this._onTaskRun(runner);
  }

  async onError(runner: TaskRun | TaskRunner) {
    await this._onTaskRun(runner);
  }

  async onShutdown() {
    if (this.taskMonitorWorker) {
      if (!this.taskMonitorWorker.queue.isIdle()) {
        await this.taskMonitorWorker.queue.await();
      }
    }
  }

  async _onTaskRun(runner: TaskRun | TaskRunner) {
    if (this.taskMonitorWorker) {
      let _runner: TaskRunner;
      if (runner instanceof TaskRun) {
        _runner = runner.getRunner();
      } else {
        _runner = runner;
      }
      const results = _runner.collectStats();
      this.taskMonitorWorker.onTaskResults(results);
    }
  }

}
