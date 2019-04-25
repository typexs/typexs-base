import {
  AsyncWorkerQueue,
  C_STORAGE_DEFAULT,
  IAsyncQueueOptions,
  ILoggerApi,
  IQueueProcessor,
  StorageRef,
  TaskLog,
  Tasks,
  Cache, Log
} from "../..";
import {Bootstrap} from "../../Bootstrap";
import {Inject} from "typedi";
import subscribe from "commons-eventbus/decorator/subscribe";
import {TaskEvent} from "./worker/TaskEvent";
import {EventBus} from "commons-eventbus";


import {Config} from "commons-config";
import * as fs from "fs";
import {PlatformUtils} from "commons-base";
import {ITaskRunnerResult} from "./ITaskRunnerResult";
import {TasksStorageHelper} from "./helper/TasksStorageHelper";
import {TasksHelper} from "./TasksHelper";
import {IWorkerStatisitic} from "../worker/IWorkerStatisitic";

export class TaskMonitor implements IQueueProcessor<TaskEvent> {

  static NAME: string = TaskMonitor.name;


  inc: number = 0;

  nodeId: string;

  queue: AsyncWorkerQueue<TaskEvent>;

  @Inject(Cache.NAME)
  cache: Cache;

  @Inject(Tasks.NAME)
  tasks: Tasks;

  @Inject(C_STORAGE_DEFAULT)
  storageRef: StorageRef;

  logdir: string;

  logger: ILoggerApi = Log.getLoggerFor(TaskMonitor);


  async prepare(options: IAsyncQueueOptions = {name: 'taskmonitorqueue', concurrent: 1}) {
    if (this.queue) {
      // already prepared
      return;
    }
    this.nodeId = Bootstrap.getNodeId();
    this.queue = new AsyncWorkerQueue<TaskEvent>(this, options);
    await EventBus.register(this);
    this.logdir = Config.get('tasks.logdir', Config.get('os.tmpdir'));
    // create logdir if not exists
    if (!PlatformUtils.fileExist(this.logdir)) {
      PlatformUtils.mkdir(this.logdir);
    }
    this.logger.debug('waiting for tasks events ...');
  }


  @subscribe(TaskEvent)
  onTaskEvent(event: TaskEvent) {
    if (event.topic == 'data' && event.respId == this.nodeId) {
      return;
    } else {

      this.queue.push(event);


    }

  }

  onTaskResults(results: ITaskRunnerResult) {
    if (results) {
      let event = new TaskEvent();
      event.topic = 'data';
      event.data = results;
      this.queue.push(event);
    } else {
      this.logger.warn('taskmonitor: results are empty?');
    }
  }


  async do(event: TaskEvent, queue?: AsyncWorkerQueue<any>): Promise<any> {
    try {
      if (event.topic == "data") {
        if (this.storageRef) {
          // storage may be not initialized
          if (event.data) {
            await TasksStorageHelper.save(event.data, this.storageRef, this.cache);
          } else {
            this.logger.error('event from ' + event.nodeId + ' has no data to save', event);
          }
        } else {
          this.logger.debug('can\'t save task log cause storage.default is not present');
        }

      } else if (event.topic == 'log') {
        let filename = TasksHelper.getTaskLogFile(event.id, event.respId);
        await new Promise((resolve, reject) => {
          let out = event.log.join("\n") + "\n";
          fs.appendFile(filename, out, (err) => {
            if (err) {
              this.logger.error('appending log to file ' + filename, err);
            } else {
              this.logger.debug('appending log to file ' + filename);
            }
            resolve();
          });
        })
      }
    } catch (err) {
      this.logger.error(err);
    }
  }


  statistic(): IWorkerStatisitic {
    let stats: IWorkerStatisitic = {
      stats: this.queue.status(),
      paused: this.queue.isPaused(),
      idle: this.queue.isIdle(),
      occupied: this.queue.isOccupied(),
      running: this.queue.isPaused(),
    };

    return stats;
  }


  async finish() {
    await EventBus.unregister(this);
    this.logger.remove();
    this.queue.removeAllListeners();
  }
}
