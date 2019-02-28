import {
  AsyncWorkerQueue,
  CryptUtils,
  IAsyncQueueOptions,
  IQueueProcessor,
  IValidationError,
  TaskRunner,
  Tasks
} from "../..";
import {Bootstrap} from "../../Bootstrap";
import {Inject} from "typedi";
import subscribe from "commons-eventbus/decorator/subscribe";
import {TaskEvent} from "./TaskEvent";
import {EventBus} from "commons-eventbus";
import {Log} from "../logging/Log";
import {ITaskWorkload} from "./ITaskWorkload";
import * as _ from 'lodash';
import {ITaskRunnerResult} from "../tasks/ITaskRunnerResult";
import {TasksHelper} from "../tasks/TasksHelper";
import {IError} from "../exceptions/IError";
import {ClassUtils} from "commons-base";
import {TASKRUN_STATE_UPDATE} from "../tasks/Constants";

export class TaskWorkerQueue implements IQueueProcessor<ITaskWorkload> {

  inc: number = 0;

  nodeId: string;

  queue: AsyncWorkerQueue<ITaskWorkload>;

  @Inject(Tasks.NAME)
  tasks: Tasks;


  async prepare(options: IAsyncQueueOptions = {name: 'taskworkerqueue'}) {
    this.nodeId = Bootstrap.getNodeId();
    this.queue = new AsyncWorkerQueue<ITaskWorkload>(this, options);
    await EventBus.register(this);
    Log.info('Task worker waiting for tasks ...');
  }


  @subscribe(TaskEvent)
  onTaskEvent(event: TaskEvent) {
    if (event.state != 'proposed') return null;
    event.respId = this.nodeId;

    let taskNames = _.isArray(event.name) ? event.name : [event.name];

    // filter not allowed tasks
    taskNames = taskNames.filter(t => _.isString(t) && this.tasks.access(t));
    if (!_.isEmpty(taskNames)) {

      // validate arguments
      let parameters = null;
      let props = TasksHelper.getRequiredIncomings(taskNames.map(t => this.tasks.get(t)));
      if (props.length > 0 && !_.isEmpty(event.parameters) && _.keys(event.parameters).length > 0) {
        let parameters = event.parameters;
        for (let p of props) {
          if (!_.has(parameters, p.storingName)) {
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
        this.queue.push({
          names: taskNames,
          parameters: parameters,
          event: event
        });
      }
    } else {
      event.state = 'errored';
      event.errors.push(<IError>{
        context: 'task_not_allowed',
        message: 'The task a not supported by this worker.'
      })
    }
    return event;
  }


  async do(workLoad: ITaskWorkload, queue?: AsyncWorkerQueue<any>): Promise<any> {
    let e = workLoad.event;
    let results: ITaskRunnerResult = null;
    let runner = new TaskRunner(this.tasks, workLoad.names);
    e.state = 'started';
    e.data = runner.collectStats();
    EventBus.postAndForget(e);
    runner.on(TASKRUN_STATE_UPDATE,() => {
      e.state = 'running';
      e.data = runner.collectStats();
      EventBus.postAndForget(e);
    });

    try {
      if (workLoad.parameters) {
        for (let p in workLoad.parameters) {
          await runner.setIncoming(p, workLoad.parameters[p]);
        }
      }
      results = await runner.run();
      e.state = 'stopped';
      e.data = runner.collectStats();
      EventBus.postAndForget(e);
    } catch (e) {
      e.state = 'errored';
      e.errors.push({
        message: e.message,
        context: ClassUtils.getClassName(e)
      });
      EventBus.postAndForget(e);
    } finally {
      runner.removeAllListeners();
    }
    return results;
  }

  /*
  onEmpty(): Promise<void> {

  }
  */


}
