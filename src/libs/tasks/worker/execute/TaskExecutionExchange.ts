import * as _ from 'lodash';
import {AbstractMessage} from '../../../messaging/AbstractMessage';
import {Tasks} from '../../Tasks';
import {TaskEvent} from '../TaskEvent';
import {TASK_RUNNER_SPEC} from '../../Constants';
import {ITaskExecutionRequestOptions} from '../ITaskExecutionRequestOptions';
import {TaskRef} from '../../TaskRef';
import {TasksHelper} from '../../TasksHelper';
import {IWorkerInfo} from '../../../worker/IWorkerInfo';
import {TaskQueueWorker} from '../../../../workers/TaskQueueWorker';
import {System} from '../../../../libs/system/System';
import {TaskFuture} from './TaskFuture';

export class TaskExecutionExchange extends AbstractMessage<TaskEvent, TaskEvent> {

  private tasks: Tasks;

  private requestOptions: ITaskExecutionRequestOptions;

  private passingTaskStates = ['request_error'];

  private event: TaskEvent;

  constructor(system: System, tasks: Tasks) {
    super(system, TaskEvent, TaskEvent);
    this.tasks = tasks;
    this.timeout = 10000;
  }


  getWorkerNodes() {
    return _.concat([], [this.system.node], this.system.nodes)
      .filter(n => {
        const x = _.find(n.contexts, c => c.context === 'workers');
        return _.get(x, 'workers', []).find((y: IWorkerInfo) => y.className === TaskQueueWorker.NAME);
      }).map(x => x.nodeId);

  }


  create(taskSpec: TASK_RUNNER_SPEC[],
         parameters: any = {},
         options: ITaskExecutionRequestOptions = {
           targetIds: [], skipTargetCheck: false
         }) {
    this.requestOptions = options;
    this.timeout = _.get(options, 'timeout', 10000);

    if (options.passingTaskState) {
      this.passingTaskStates.push(options.passingTaskState);
    } else {
      this.passingTaskStates.push('enqueue');
    }

    if (!options.skipTargetCheck) {
      const workerIds = this.getWorkerNodes();

      const possibleTargetIds: string[][] = [workerIds];
      const tasks: TaskRef[] = this.tasks.getTasks(TasksHelper.getTaskNames(taskSpec));
      for (const taskRef of tasks) {
        possibleTargetIds.push(taskRef.nodeIds);
      }

      if (options.targetIds.length === 0) {
        // get intersection of nodeIds
        this.targetIds = _.intersection(...possibleTargetIds);
      } else {
        this.targetIds = _.intersection(options.targetIds, ...possibleTargetIds);
      }

      if (this.targetIds.length === 0) {
        throw new Error('not target intersection found for tasks: ' + taskSpec.join(', '));
      }

    } else {
      this.targetIds = options.targetIds;
    }

    this.event = new TaskEvent();
    this.event.taskSpec = taskSpec;
    for (const k of _.keys(parameters)) {
      if (!/^_/.test(k)) {
        this.event.addParameter(k, _.get(parameters, k));
      }
    }
    return this;
  }

  async run() {
    await this.send(this.event);
    return this.results;
  }


  requestCheck(res: TaskEvent): boolean {
    // wait for results or wait for enqueue
    // check state
    if (this.passingTaskStates.indexOf(res.state) === -1) {
      return false;
    }
    return true;
  }

  doPostProcess(responses: TaskEvent[], err: Error) {
    return responses;
  }

  async future(filter: (event: TaskEvent) => boolean =
                 (event: TaskEvent) => event.state !== 'running') {
    const future = new TaskFuture({
      eventId: this.event.id,
      filter: filter
    });
    await future.register();
    return future;
  }

}
