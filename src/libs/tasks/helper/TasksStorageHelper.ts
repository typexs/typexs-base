import {ITaskRunnerResult} from "../ITaskRunnerResult";
import {StorageRef, TaskLog, Cache} from "../../..";
import * as _ from "lodash";
import {ITaskRunResult} from "../ITaskRunResult";


export class TasksStorageHelper {

  static async save(taskRunnerResults: ITaskRunnerResult,
                    storageRef: StorageRef,
                    cache: Cache = null) {

    let logs: TaskLog[] = await storageRef
      .getController()
      .find(TaskLog, {tasksId: taskRunnerResults.id});

    const taskNames = _.isArray(taskRunnerResults.tasks) ? taskRunnerResults.tasks : [taskRunnerResults.tasks];
    const results = _.get(taskRunnerResults, "results", null);
    for (let targetId of taskRunnerResults.targetIds) {
      for (let taskName of taskNames) {
        let exists = _.find(logs, l => l.taskName === taskName && l.respId == targetId);
        if (!exists) {
          exists = new TaskLog();
          exists.tasksId = taskRunnerResults.id;
          exists.nodeId = taskRunnerResults.nodeId;
          exists.taskName = taskName;
          exists.respId = targetId;
          logs.push(exists);
        }
        exists.state = taskRunnerResults.state;

        if (results) {
          const result: ITaskRunResult = _.find(results, r => r.name == taskName);
          exists.taskNr = result.nr;
          exists.hasError = result.has_error;
          //exists.errors = JSON.stringify(result.error);
          exists.started = result.start;
          exists.stopped = result.stop;
          exists.created = result.created;
          exists.duration = result.duration;
          exists.progress = result.progress;
          exists.total = result.total;
          exists.done = _.get(result, 'done', false);
          exists.running = _.get(result, 'running', false);
          exists.weight = _.get(result, 'weight', -1);

          exists.data = <any>{
            results: result.result,
            incoming: result.incoming,
            outgoing: result.outgoing,
            error: result.error
          };
        }

        if (exists.tasksId && exists.respId && cache) {
          const cacheKey = [exists.tasksId, targetId].join(':');
          cache.set(cacheKey, exists);
        }
      }
      // TODO notify a push api if it exists
    }
    await storageRef.getController().save(logs);
  }


}
