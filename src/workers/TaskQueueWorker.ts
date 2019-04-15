import {AsyncWorkerQueue, IAsyncQueueOptions, ILoggerApi, IQueueProcessor, TaskRunner, Tasks} from "..";
import {Bootstrap} from "../Bootstrap";
import {Inject} from "typedi";
import subscribe from "commons-eventbus/decorator/subscribe";
import {TaskEvent} from "./../libs/tasks/worker/TaskEvent";
import {EventBus} from "commons-eventbus";
import {Log} from "../libs/logging/Log";
import {ITaskWorkload} from "./../libs/tasks/worker/ITaskWorkload";
import * as _ from 'lodash';
import {ITaskRunnerResult} from "../libs/tasks/ITaskRunnerResult";
import {TasksHelper} from "../libs/tasks/TasksHelper";
import {IError} from "../libs/exceptions/IError";
import {ClassUtils} from "commons-base";
import {TASKRUN_STATE_UPDATE} from "../libs/tasks/Constants";
import {IWorker} from "../libs/worker/IWorker";
import {IWorkerStatisitic} from "../libs/worker/IWorkerStatisitic";


export class TaskQueueWorker implements IQueueProcessor<ITaskWorkload>, IWorker {

  static NAME: string = 'TaskQueueWorker';

  name: string = 'task_queue_worker';

  inc: number = 0;

  nodeId: string;

  queue: AsyncWorkerQueue<ITaskWorkload>;

  @Inject(Tasks.NAME)
  tasks: Tasks;

  logger: ILoggerApi = Log.getLoggerFor(TaskQueueWorker);


  async prepare(options: IAsyncQueueOptions = {name: 'taskworkerqueue'}) {
    this.nodeId = Bootstrap.getNodeId();
    this.queue = new AsyncWorkerQueue<ITaskWorkload>(this, options);
    await EventBus.register(this);
    this.logger.debug('Task worker: waiting for tasks ...');
  }


  @subscribe(TaskEvent)
  onTaskEvent(event: TaskEvent) {
    if (event.state != 'proposed') return null;

    if (event.targetIds && event.targetIds.indexOf(this.nodeId) == -1) {
      // not a task for me
      return null;
    }

    event.respId = this.nodeId;
    event.topic = "data";

    let parameters: any = null;
    let taskNames = _.isArray(event.name) ? event.name : [event.name];

    // filter not allowed tasks
    taskNames = taskNames.filter(t => _.isString(t) && this.tasks.access(t));
    if (!_.isEmpty(taskNames)) {

      // validate arguments
      let props = TasksHelper.getRequiredIncomings(taskNames.map(t => this.tasks.get(t)));
      if (props.length > 0) {
        parameters = event.parameters;
        for (let p of props) {
          if (!_.has(parameters, p.storingName) && !_.has(parameters, p.name)) {
            if (p.isOptional()) {
              this.logger.warn('task worker: optional parameter "' + p.name + '" for ' + taskNames.join(', ') + ' not found')
            } else {
              event.state = 'request_error';
              event.errors.push(<IError>{
                context: 'required_parameter',
                data: {
                  required: p.name
                },
                message: 'The required value is not passed.'
              });
              this.logger.error('task worker: necessery parameter "' + p.name + '" for ' + taskNames.join(', ') + ' not found')
            }
          }
        }
      }

      if (event.state == 'proposed') {
        event.state = 'enqueue';
      }

    } else {
      event.state = 'request_error';
      event.errors.push(<IError>{
        context: 'task_not_allowed',
        message: 'The task a not supported by this worker.'
      });
    }

    if (event.state == 'enqueue') {
      setTimeout(() =>
        this.queue.push({
          names: taskNames,
          parameters: parameters,
          event: event
        }), 10);
    }

    this.logger.debug('enqueue task event:', event);
    return this.fireState(event);
  }


  async do(workLoad: ITaskWorkload, queue?: AsyncWorkerQueue<any>): Promise<any> {
    let e = workLoad.event;
    let results: ITaskRunnerResult = null;

    let runner = new TaskRunner(this.tasks, workLoad.names, {
      id: e.id,
      nodeId: this.nodeId,
      targetIds: e.targetIds
    });

    runner.getReadStream().on('data', (x: any) => {
      e.topic = 'log';
      e.log = x.toString().split('\n').filter((x: string) => !_.isEmpty(x));
      this.fireState(e);
    });

    runner.on(TASKRUN_STATE_UPDATE, () => {
      e.topic = "data";
      e.data = runner.collectStats();
      this.fireState(e);
    });

    e.state = 'started';
    e.topic = "data";
    e.data = runner.collectStats();
    this.fireState(e);

    try {
      if (workLoad.parameters) {
        for (let p in workLoad.parameters) {
          await runner.setIncoming(p, workLoad.parameters[p]);
        }
      }
      e.state = 'running';
      results = await runner.run();
      e.state = 'stopped';
      e.topic = "data";
      e.data = runner.collectStats();
      this.fireState(e);
    } catch (err) {
      e.state = 'errored';
      e.topic = "data";
      e.errors.push({
        message: err.message,
        context: ClassUtils.getClassName(err)
      });
      runner.getLogger().error(err);
      this.fireState(e);
    } finally {
      runner.removeAllListeners();
    }
    return results;
  }


  fireState(e: TaskEvent): TaskEvent {
    let _e = _.cloneDeep(e);
    EventBus.postAndForget(_e);
    return _e;
  }

  /*
  onEmpty(): Promise<void> {

  }
  */


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
