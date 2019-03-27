import {
  AsyncWorkerQueue,
  C_STORAGE_DEFAULT,
  IAsyncQueueOptions,
  ILoggerApi,
  IQueueProcessor,
  StorageRef,
  TaskLog,
  Tasks
} from "..";
import {Bootstrap} from "../Bootstrap";
import {Inject} from "typedi";
import subscribe from "commons-eventbus/decorator/subscribe";
import {TaskEvent} from "./../libs/tasks/worker/TaskEvent";
import {EventBus} from "commons-eventbus";
import {Log} from "../libs/logging/Log";
import {IWorker} from "../libs/worker/IWorker";
import * as _ from "lodash";
import {ITaskRunResult} from "../libs/tasks/ITaskRunResult";
import {Config} from "commons-config";
import * as fs from "fs";
import * as path from "path";

export class TaskMonitorWorker implements IQueueProcessor<TaskEvent>, IWorker {

  static NAME: string = 'TaskMonitorWorker';

  inc: number = 0;

  nodeId: string;

  queue: AsyncWorkerQueue<TaskEvent>;

  @Inject(Tasks.NAME)
  tasks: Tasks;

  @Inject(C_STORAGE_DEFAULT)
  storageRef: StorageRef;

  logdir: string;

  logger: ILoggerApi = Log.getLoggerFor(TaskMonitorWorker);


  async prepare(options: IAsyncQueueOptions = {name: 'taskmonitorworkerqueue', concurrent: 1}) {
    this.nodeId = Bootstrap.getNodeId();
    this.queue = new AsyncWorkerQueue<TaskEvent>(this, options);
    await EventBus.register(this);
    this.logdir = Config.get('tasks.logdir', Config.get('os.tmpdir'));
    this.logger.debug('waiting for tasks events ...');
  }


  @subscribe(TaskEvent)
  onTaskEvent(event: TaskEvent) {
    this.queue.push(event);
  }

  getFileName(id: string, respId: string) {
    let filename = path.join(this.logdir, 'taskmonitor-' + id + '-' + respId + '.log');
    return filename;
  }

  async do(event: TaskEvent, queue?: AsyncWorkerQueue<any>): Promise<any> {
    try {
      if (event.topic == "data") {
        let logs: TaskLog[] = await this.storageRef
          .getController()
          .find(TaskLog, {tasksId: event.id});

        const taskNames = _.isArray(event.name) ? event.name : [event.name];
        const results = _.get(event, "data.results", null);
        for (let taskName of taskNames) {
          let exists = _.find(logs, l => l.taskName === taskName);
          if (!exists) {
            exists = new TaskLog();
            exists.tasksId = event.id;
            exists.taskName = taskName;
            logs.push(exists);
          }
          exists.state = event.state;
          exists.nodeId = event.nodeId;
          exists.respId = event.respId;

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


        }

        await this.storageRef.getController().save(logs);

      } else if (event.topic == 'log') {
        let filename = this.getFileName(event.id, event.respId);
        await new Promise((resolve, reject) => {
          let out = event.log.join("\n")+"\n";
          fs.appendFile(filename, out, (err) => {
            if(err){
              this.logger.error('appending log to file ' + filename, err);
            }else{
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


  finish(): void {
    this.logger.remove();
    this.queue.removeAllListeners();
  }
}
