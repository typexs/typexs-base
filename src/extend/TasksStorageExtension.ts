import {Inject} from 'typedi';
import {UseAPI} from '../decorators/UseAPI';
import {TasksApi} from '../api/Tasks.api';
import {ITasksApi} from '../api/ITasksApi';
import {TaskRunner} from '../libs/tasks/TaskRunner';
import {TaskRun} from '../libs/tasks/TaskRun';
import {C_STORAGE_DEFAULT, Cache, Log, StorageRef} from '..';
import {TasksStorageHelper} from '../libs/tasks/helper/TasksStorageHelper';


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
      if (_runner.getOption('local', false)) {
        // only local tasks must be saved
        const results = _runner.collectStats();
        return TasksStorageHelper.save(results, this.storageRef, this.cache);
      }
    }
    return null;
  }

}
