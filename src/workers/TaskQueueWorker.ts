import {AsyncWorkerQueue, IAsyncQueueOptions, IQueueProcessor, TaskRunner, Tasks} from "..";
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

export class TaskQueueWorker implements IQueueProcessor<ITaskWorkload>, IWorker{

  inc: number = 0;

  nodeId: string;

  queue: AsyncWorkerQueue<ITaskWorkload>;

  @Inject(Tasks.NAME)
  tasks: Tasks;


  async prepare(options: IAsyncQueueOptions = {name: 'taskworkerqueue'}) {
    this.nodeId = Bootstrap.getNodeId();
    this.queue = new AsyncWorkerQueue<ITaskWorkload>(this, options);
    await EventBus.register(this);
    Log.debug('Task worker: waiting for tasks ...');
  }


  @subscribe(TaskEvent)
  onTaskEvent(event: TaskEvent) {
    if (event.state != 'proposed') return null;

    if (event.targetIds && event.targetIds.indexOf(this.nodeId) == -1) {
      // not a task for me
      return null;
    }

    event.respId = this.nodeId;
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
            event.state = 'errored';
            event.errors.push(<IError>{
              context: 'required_parameter',
              data: {
                required: p.name
              },
              message: 'The required value is not passed.'
            });
            Log.error('task worker: necessery parameter "' + p.name + '" for ' + taskNames.join(', ') + ' not found')
          }
        }
      }

      if (event.state == 'proposed') {
        event.state = 'enqueue';

      }
    } else {
      event.state = 'errored';
      event.errors.push(<IError>{
        context: 'task_not_allowed',
        message: 'The task a not supported by this worker.'
      });
    }
    Log.debug('onTaskEvent', event);

    if (event.state == 'enqueue') {
      setTimeout(() =>
        this.queue.push({
          names: taskNames,
          parameters: parameters,
          event: event
        }), 10);
    }

    return this.fireState(event);
  }


  async do(workLoad: ITaskWorkload, queue?: AsyncWorkerQueue<any>): Promise<any> {
    let e = workLoad.event;
    let results: ITaskRunnerResult = null;
    let runner = new TaskRunner(this.tasks, workLoad.names);

    runner.getReadStream().on('data', (x: any) => {
      e.state = 'running';
      e.topic = 'log';
      e.log = x.toString().split('\n').filter((x: string) => !_.isEmpty(x));
      this.fireState(e);
    });

    runner.on(TASKRUN_STATE_UPDATE, () => {
      e.state = 'running';
      e.data = runner.collectStats();
      this.fireState(e);
    });

    e.state = 'started';
    e.data = runner.collectStats();
    this.fireState(e);


    try {

      if (workLoad.parameters) {
        for (let p in workLoad.parameters) {
          await runner.setIncoming(p, workLoad.parameters[p]);
        }
      }
      results = await runner.run();
      e.state = 'stopped';
      e.data = runner.collectStats();
      this.fireState(e);
    } catch (err) {
      e.state = 'errored';
      e.errors.push({
        message: err.message,
        context: ClassUtils.getClassName(err)
      });
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


  finish(): void {
    this.queue.removeAllListeners();
  }
}
