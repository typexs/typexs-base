import {Bootstrap} from '../../Bootstrap';
import {Inject} from 'typedi';
import {EventBus, subscribe} from 'commons-eventbus';
import {TaskEvent} from './worker/TaskEvent';
import {Config} from 'commons-config';
import * as fs from 'fs';
import {PlatformUtils} from 'commons-base';
import {ITaskRunnerResult} from './ITaskRunnerResult';
import {TasksStorageHelper} from './helper/TasksStorageHelper';
import {TasksHelper} from './TasksHelper';
import {IWorkerStatisitic} from '../worker/IWorkerStatisitic';
import {IQueueProcessor} from '../queue/IQueueProcessor';
import {AsyncWorkerQueue} from '../queue/AsyncWorkerQueue';
import {Cache} from '../cache/Cache';
import {Tasks} from './Tasks';
import {C_STORAGE_DEFAULT} from '../Constants';
import {StorageRef} from '../storage/StorageRef';
import {ILoggerApi} from '../logging/ILoggerApi';
import {Log} from '../logging/Log';
import {IAsyncQueueOptions} from '../queue/IAsyncQueueOptions';

export class TaskMonitor implements IQueueProcessor<TaskEvent> {

  static NAME: string = TaskMonitor.name;


  inc = 0;

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
    if (event.topic === 'data' && event.respId === this.nodeId) {
      return;
    } else {
      this.queue.push(event);
    }

  }

  onTaskResults(results: ITaskRunnerResult) {
    if (results) {
      const event = new TaskEvent();
      event.topic = 'data';
      event.data = results;
      this.queue.push(event);
    } else {
      this.logger.warn('taskmonitor: results are empty?');
    }
  }


  async do(event: TaskEvent, queue?: AsyncWorkerQueue<any>): Promise<any> {
    try {
      if (event.topic === 'data') {
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

      } else if (event.topic === 'log') {
        const filename = TasksHelper.getTaskLogFile(event.id, event.respId);
        await new Promise((resolve) => {
          const out = event.log.join('\n') + '\n';
          fs.appendFile(filename, out, (err) => {
            if (err) {
              this.logger.error('appending log to file ' + filename, err);
            } else {
              this.logger.debug('appending log to file ' + filename);
            }
            resolve();
          });
        });
      }
    } catch (err) {
      this.logger.error(err);
    }
  }


  statistic(): IWorkerStatisitic {
    const stats: IWorkerStatisitic = {
      stats: this.queue.status(),
      paused: this.queue.isPaused(),
      idle: this.queue.isIdle(),
      occupied: this.queue.isOccupied(),
      running: this.queue.isPaused(),
    };
    return stats;
  }


  async finish(_await: boolean = true) {
    await EventBus.unregister(this);
    if (_await) {
      await this.queue.await();
    }
    this.logger.remove();
    this.queue.removeAllListeners();
  }
}
