import {Inject} from 'typedi';
import {EventBus, subscribe} from 'commons-eventbus';
import {Config} from '@allgemein/config';
import * as fs from 'fs';
import {PlatformUtils} from '@allgemein/base';

import {IQueueProcessor} from '../libs/queue/IQueueProcessor';
import {Tasks} from '../libs/tasks/Tasks';
import {AsyncWorkerQueue} from '../libs/queue/AsyncWorkerQueue';
import {TasksStorageHelper} from '../libs/tasks/helper/TasksStorageHelper';
import {TasksHelper} from '../libs/tasks/TasksHelper';
import {IWorkerStatisitic} from '../libs/worker/IWorkerStatisitic';
import {TaskEvent} from '../libs/tasks/worker/TaskEvent';
import {IWorker} from '../libs/worker/IWorker';
import {C_STORAGE_DEFAULT} from '../libs/Constants';
import {StorageRef} from '../libs/storage/StorageRef';
import {ILoggerApi} from '../libs/logging/ILoggerApi';
import {Log} from '../libs/logging/Log';
import {Bootstrap} from '../Bootstrap';
import {ITaskMonitorWorkerOptions} from '../libs/tasks/worker/ITaskMonitorWorkerOptions';

export class TaskMonitorWorker implements IQueueProcessor<TaskEvent>, IWorker {

  static NAME: string = TaskMonitorWorker.name;

  name = TaskMonitorWorker.name;

  inc = 0;

  nodeId: string;

  queue: AsyncWorkerQueue<TaskEvent>;

  @Inject(Tasks.NAME)
  tasks: Tasks;

  @Inject(C_STORAGE_DEFAULT)
  storageRef: StorageRef;

  logdir: string;

  logger: ILoggerApi = Log.getLoggerFor(TaskMonitorWorker);


  async prepare(options: ITaskMonitorWorkerOptions = {name: 'taskmonitorqueue', concurrent: 40}) {
    if (this.queue) {
      // already prepared
      return;
    }
    this.nodeId = Bootstrap.getNodeId();
    this.queue = new AsyncWorkerQueue<TaskEvent>(this, {...options, logger: this.logger});
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
    // listen only on implicit source
    this.queue.push(event);
  }


  async do(event: TaskEvent, queue?: AsyncWorkerQueue<any>): Promise<any> {
    try {
      if (event.topic === 'data') {
        if (this.storageRef) {
          // storage may be not initialized
          if (event.data) {
            await TasksStorageHelper.save(event.data, this.storageRef);
          } else {
            this.logger.error('event from ' + event.nodeId + ' has no data to save', event);
          }
        } else {
          this.logger.debug('can\'t save task log cause storage.default is not present');
        }

      } else if (event.topic === 'log') {
        const filename = TasksHelper.getTaskLogFile(event.id, event.nodeId);
        await new Promise((resolve) => {
          const out = event.log.join('\n') + '\n';
          fs.appendFile(filename, out, (err) => {
            if (err) {
              this.logger.error('appending log to file ' + filename, err);
            }
            resolve(null);
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
