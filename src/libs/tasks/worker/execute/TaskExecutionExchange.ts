import * as _ from 'lodash';
import {AbstractMessage} from '../../../messaging/AbstractMessage';
import {Tasks} from '../../Tasks';
import {TaskEvent} from '../TaskEvent';
import {TASK_RUNNER_SPEC} from '../../Constants';
import {ITaskExecutionRequestOptions} from '../ITaskExecutionRequestOptions';
import {TaskRef} from '../../TaskRef';
import {TasksHelper} from '../../TasksHelper';
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

    let workerNodes = null;
    if (!options.targetIds || !_.isArray(options.targetIds)) {
      workerNodes = TasksHelper.getWorkerNodes(this.system);
      let onNodes = options.executeOnMultipleNodes ? options.executeOnMultipleNodes : 1;

      let nodesForSelection = _.clone(workerNodes);

      if (options.randomWorkerSelection) {
        nodesForSelection = _.shuffle(nodesForSelection);
      }
      this.targetIds = [];
      while (nodesForSelection.length > 0 && onNodes > 0) {
        onNodes--;
        this.targetIds.push(nodesForSelection.shift());
      }
    }

    if (!options.skipTargetCheck) {
      if (!workerNodes) {
        workerNodes = TasksHelper.getWorkerNodes(this.system);
      }

      const possibleTargetIds: string[][] = [workerNodes];
      const tasks: TaskRef[] = this.tasks.getTasks(TasksHelper.getTaskNames(taskSpec));
      for (const taskRef of tasks) {
        possibleTargetIds.push(taskRef.nodeInfos.filter(x => x.hasWorker).map(x => x.nodeId));
      }

      if (options.targetIds && _.isArray(options.targetIds)) {
        if (options.targetIds.length === 0) {
          // get intersection of nodeInfos
          this.targetIds = _.intersection(...possibleTargetIds);
        } else {
          this.targetIds = _.intersection(options.targetIds, ...possibleTargetIds);
        }
      }

      if (this.targetIds.length === 0) {
        throw new Error('not target intersection found for tasks: ' + taskSpec.join(', '));
      }

    } else {
      if (!this.targetIds && options.targetIds) {
        this.targetIds = options.targetIds;
      }
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
