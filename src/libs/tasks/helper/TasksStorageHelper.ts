import {ITaskRunnerResult} from '../ITaskRunnerResult';
import * as _ from 'lodash';
import {ITaskRunResult} from '../ITaskRunResult';
import {StorageRef} from '../../storage/StorageRef';
import {TaskLog} from '../../../entities/TaskLog';
import {Cache} from '../../cache/Cache';
import {Semaphore} from '../../Semaphore';
import {EventEmitter} from 'events';


export class TasksStorageHelper {

  // static emitter: EventEmitter = new EventEmitter();

  static semaphores: { [k: string]: Semaphore } = {};

  static async save(taskRunnerResults: ITaskRunnerResult,
                    storageRef: StorageRef,
                    cache: Cache = null) {

    if (!this.semaphores[taskRunnerResults.id]) {
      this.semaphores[taskRunnerResults.id] = new Semaphore(1);
    }
    this.semaphores[taskRunnerResults.id].acquire();


    const logs: TaskLog[] = await storageRef
      .getController()
      .find(TaskLog, {tasksId: taskRunnerResults.id});

    let toremove: TaskLog[] = [];
    const taskNames = _.isArray(taskRunnerResults.tasks) ? taskRunnerResults.tasks : [taskRunnerResults.tasks];
    const results = _.get(taskRunnerResults, 'results', null);
    for (const targetId of taskRunnerResults.targetIds) {
      for (const taskName of taskNames) {
        const existsAll = _.remove(logs, l => l.taskName === taskName && l.respId === targetId);
        let exists = existsAll.shift();
        if (existsAll.length > 0) {
          toremove = _.concat(toremove, existsAll);
        }
        if (!exists) {
          exists = new TaskLog();
          exists.tasksId = taskRunnerResults.id;
          exists.nodeId = taskRunnerResults.nodeId;
          exists.taskName = taskName;
          exists.respId = targetId;
        }
        logs.push(exists);
        exists.state = taskRunnerResults.state;

        if (results) {
          const result: ITaskRunResult = _.find(results, r => r.name === taskName);
          exists.taskNr = result.nr;
          exists.hasError = result.has_error;
          // exists.errors = JSON.stringify(result.error);
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
          const cacheKey = ['tasklog', exists.tasksId, targetId].join(':');
          cache.set(cacheKey, exists);
        }
      }
      // TODO notify a push api if it exists
    }

    await storageRef.getController().save(logs);

    if (toremove.length > 0) {
      await storageRef.getController().remove(toremove);
    }

    this.semaphores[taskRunnerResults.id].release();

    if (!this.semaphores[taskRunnerResults.id].hasWaiting()) {
      // cleanup
      this.semaphores[taskRunnerResults.id].purge();
      delete this.semaphores[taskRunnerResults.id];
      // if (_.keys(this.semaphores).length === 0) {
      //   this.emitter.emit('done');
      // }

    }
  }
  //
  // static await() {
  //   return new Promise(resolve => {
  //     this.emitter.once('done', resolve);
  //   });
  // }


}
