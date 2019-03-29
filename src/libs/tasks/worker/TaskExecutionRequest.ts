import * as _ from "lodash";

import {Log, TaskRef, Tasks} from "../../..";
import {System} from "../../system/System";
import {EventEmitter} from "events";

import subscribe from "commons-eventbus/decorator/subscribe";
import {EventBus} from "commons-eventbus";
import {TaskEvent} from "./TaskEvent";
import {TaskQueueWorker} from "../../../workers/TaskQueueWorker";
import {IWorkerInfo} from "../../worker/IWorkerInfo";


export class TaskExecutionRequest extends EventEmitter {


  private system: System;


  private tasks: Tasks;

  private timeout: number = 5000;

  private event: TaskEvent;

  private responses: TaskEvent[] = [];

  private targetIds: string[];

  private results: any[] = [];

  private active: boolean = true;

  constructor(system: System, tasks: Tasks) {
    super();
    this.system = system;
    this.tasks = tasks;
    this.once('postprocess', this.postProcess.bind(this));
  }


  async run(taskNames: string[],
            parameters: any = {},
            nodeIds: string[] = []): Promise<TaskEvent[]> {

    let workerIds = _.concat([], [this.system.node], this.system.nodes)
      .filter(n => {
        let x = _.find(n.contexts, c => c.context == 'workers');
        return _.get(x, 'workers', []).find((y: IWorkerInfo) => y.name == TaskQueueWorker.NAME);
      }).map(x => x.nodeId);


    let possibleTargetIds: string[][] = [workerIds];
    let tasks: TaskRef[] = this.tasks.getTasks(taskNames);
    for (let taskRef of tasks) {
      possibleTargetIds.push(taskRef.nodeIds);
    }

    if (nodeIds.length == 0) {
      // get intersection of nodeIds
      this.targetIds = _.intersection(...possibleTargetIds);
    } else {
      this.targetIds = _.intersection(nodeIds, ...possibleTargetIds);
    }

    if (this.targetIds.length == 0) {
      throw new Error('not target intersection found for tasks: ' + taskNames.join(', '))
    }

    this.event = new TaskEvent();
    this.event.nodeId = this.system.node.nodeId;
    this.event.name = taskNames;
    this.event.targetIds = this.targetIds;
    for (let k of _.keys(parameters)) {
      if (!/^_/.test(k)) {
        this.event.addParameter(k, _.get(parameters, k));
      }
    }


    await EventBus.register(this);
    Log.debug('fire execution result: ', this.event);
    let _err: Error = null;
    try {
      const ready = this.ready();
      EventBus.postAndForget(this.event);
      await ready;
    } catch (err) {
      _err = err;
      Log.error(err);
    } finally {
    }

    await EventBus.unregister(this);
    this.removeAllListeners();

    Log.debug('fire execution finished for ' + this.event.id);
    if (_err) {
      throw _err;
    }


    return this.results;
  }


  postProcess(err: Error) {
    this.results = this.responses;
    this.emit('finished', err, this.results);
  }


  @subscribe(TaskEvent)
  onResults(event: TaskEvent): any {
    Log.debug('task event entered ' + event.id + ' ' + event.state + ' ' + event.respId);
    if (!this.active) return;

    // has query event
    if (!this.event) return;

    // check state
    if (['enqueue', 'request_error'].indexOf(event.state) === -1) return null;

    // has same id
    if (this.event.id !== event.id) return;

    // waiting for the results?
    if (this.targetIds.indexOf(event.respId) == -1) return;
    _.remove(this.targetIds, x => x == event.respId);

    const eClone = _.cloneDeep(event);
    this.responses.push(eClone);

    Log.debug('task exec request [' + this.targetIds.length + ']: ', eClone);
    if (this.targetIds.length == 0) {
      this.active = false;
      this.emit('postprocess')
    }
  }


  ready() {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.emit('postprocess', new Error('timeout error'));
        clearTimeout(t);
      }, this.timeout);

      this.once('finished', (err: Error, data: any) => {
        clearTimeout(t);
        if (err) {
          Log.error(err);
          if (data) {
            resolve(data);
          } else {
            reject(err);
          }
        } else {
          resolve(data);
        }
      });

    })
  }


}
