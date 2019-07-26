import {Inject} from 'typedi';
import {UseAPI} from '../decorators/UseAPI';
import {TasksApi} from '../api/Tasks.api';
import {ITasksApi} from '../api/ITasksApi';
import {TaskRunner} from '../libs/tasks/TaskRunner';
import {TaskRun} from '../libs/tasks/TaskRun';
import {TasksStorageHelper} from '../libs/tasks/helper/TasksStorageHelper';
import {C_STORAGE_DEFAULT, Cache, StorageRef} from '..';


@UseAPI(TasksApi)
export class TasksStorageExtension implements ITasksApi {

  @Inject(Cache.NAME)
  cache: Cache;


  @Inject(C_STORAGE_DEFAULT)
  storageRef: StorageRef;

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


  async _onTaskRun(runner: TaskRun | TaskRunner) {
    if (this.storageRef) {
      let _runner: TaskRunner;
      if (runner instanceof TaskRun) {
        _runner = runner.getRunner();
      } else {
        _runner = runner;
      }
      if (_runner.getOption('local', false)) {
        // only local tasks must be saved
        const results = _runner.collectStats();
        await TasksStorageHelper.save(results, this.storageRef, this.cache);
      }
    }
  }

}
