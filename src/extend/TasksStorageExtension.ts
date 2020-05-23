import {Inject} from 'typedi';
import {UseAPI} from '../decorators/UseAPI';
import {TasksApi} from '../api/Tasks.api';
import {ITasksApi} from '../api/ITasksApi';
import {TaskRunner} from '../libs/tasks/TaskRunner';
import {TaskRun} from '../libs/tasks/TaskRun';
import {TasksStorageHelper} from '../libs/tasks/helper/TasksStorageHelper';
import {C_STORAGE_DEFAULT} from '../libs/Constants';
import {Cache} from '../libs/cache/Cache';
import {StorageRef} from '../libs/storage/StorageRef';


@UseAPI(TasksApi)
export class TasksStorageExtension implements ITasksApi {

  @Inject(Cache.NAME)
  cache: Cache;


  @Inject(C_STORAGE_DEFAULT)
  storageRef: StorageRef;


  onBefore(runner: TaskRunner) {
    this._onTaskRun(runner);
  }

  onStart(run: TaskRun) {
    this._onTaskRun(run);
  }

  onProgress(run: TaskRun) {
    this._onTaskRun(run);
  }

  onStop(run: TaskRun) {
    this._onTaskRun(run);
  }


  onAfter(runner: TaskRunner) {
    this._onTaskRun(runner);
  }

  onError(runner: TaskRun | TaskRunner) {
    this._onTaskRun(runner);
  }


  _onTaskRun(runner: TaskRun | TaskRunner) {
    if (this.storageRef) {
      let _runner: TaskRunner;
      if (runner instanceof TaskRun) {
        _runner = runner.getRunner();
      } else {
        _runner = runner;
      }

      const results = _runner.collectStats();
      return TasksStorageHelper.save(results, this.storageRef);
    }
    return null;
  }

}
