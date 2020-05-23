/**
 * TODO: Future object which waits till a task is done
 */
import * as _ from 'lodash';
import {EventEmitter} from 'events';
import {subscribe, unsubscribe} from 'commons-eventbus/browser';
import {TaskEvent} from '../TaskEvent';
import {EventBus} from 'commons-eventbus';
import {ITaskFutureOptions} from './ITaskFutureOptions';
import {ITaskRunnerResult} from '../../ITaskRunnerResult';


const future_finished = 'future_finished';

export class TaskFuture extends EventEmitter {

  private start: Date = new Date();

  private runnerId: string;

  private options: ITaskFutureOptions;

  private targetState: { [k: string]: string } = {};

  private targetResults: { [k: string]: ITaskRunnerResult } = {};

  private events: TaskEvent[] = [];

  private finished: boolean = false;

  constructor(options: ITaskFutureOptions) {
    super();
    this.options = options;
  }


  getEventId() {
    return this.options.eventId;
  }

  getRunnerId() {
    return this.runnerId;
  }

  async register() {
    subscribe(TaskEvent)(this, 'onTaskEvent');
    await EventBus.register(this);
  }


  async unregister() {
    try {
      await EventBus.unregister(this);
      unsubscribe(this, TaskEvent, 'onTaskEvent');
    } catch (e) {
    }
  }


  async onTaskEvent(event: TaskEvent) {
    if (this.options.eventId === event.reqEventId) {
      if (!this.runnerId) {
        this.runnerId = event.data.id;
      }
      if (this.options.filter && this.options.filter(event)) {
        this.events.push(event);
        this.emit('future_event', event);
      }
      this.targetState[event.respId] = event.state;
      if (event.state === 'stopped' || event.state === 'errored' || event.state === 'request_error') {
        if (event.data) {
          this.targetResults[event.respId] = event.data;
        }
      }

      if (this.isFinished()) {
        await this.close();
      }
    }
  }

  async close() {
    await this.unregister();
    this.finished = true;
    this.emit(future_finished);
  }

  await(timeout: number = 0): Promise<ITaskRunnerResult[]> {
    if (this.finished) {
      const values = _.values(this.targetResults);
      return Promise.resolve(values);
    }

    return new Promise<ITaskRunnerResult[]>((resolve, reject) => {
      const t = timeout > 0 ? setTimeout(() => {
        clearTimeout(t);
        reject(new Error('timeout error: ' + timeout + 'ms passed'));
      }, timeout) : null;

      this.once(future_finished, () => {
        clearTimeout(t);
        const values = _.values(this.targetResults);
        resolve(values);
      });
    });
  }


  isFinished() {
    let yes = true;
    for (const k of _.keys(this.targetState)) {
      if (!['stopped', 'request_error', 'errored'].includes(this.targetState[k])) {
        yes = false;
        break;
      }
    }
    return yes;
  }

}
