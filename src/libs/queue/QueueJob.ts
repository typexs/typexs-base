import {IQueueWorkload} from './IQueueWorkload';
import {IQueue} from './IQueue';
import {CryptUtils} from '@allgemein/base';


export class QueueJob<T extends IQueueWorkload> {

  private static _INC = 0;

  private _id: string;

  private _queue: IQueue;

  private _workload: T;

  private _start: Date = null;

  private _stop: Date = null;

  private _enqueued: Date = null;

  private _duration: number;

  private _error: Error = null;

  private _result: any = null;

  constructor(queue: IQueue, workload: T) {
    this._workload = workload;
    this._queue = queue;
    this._id = CryptUtils.shorthash((new Date()).getTime() + '' + (QueueJob._INC++));
    this._queue.once(this.jobEventName('stop'), this.onDone.bind(this));
  }

  public get id(): string {
    return this._id;
  }

  public workload(): T {
    return this._workload;
  }

  public enqueued(): Promise<QueueJob<T>> {
    return new Promise((resolve) => {
      if (!this._enqueued) {
        this._queue.once(this.jobEventName('enqueued'), (job: QueueJob<T>) => {
          resolve(job);
        });
      } else {
        resolve(this);
      }
    });
  }

  getResult() {
    return this._result;
  }

  setResult(v: any) {
    this._result = v;
  }

  getError() {
    return this._error;
  }

  /**
   * Wait till the job is begins
   */
  public starting(): Promise<QueueJob<T>> {
    return new Promise((resolve) => {
      if (!this._start) {
        this._queue.once(this.jobEventName('start'), () => {
          resolve(this);
        });
      } else {
        // if started then pass through
        resolve(this);
      }
    });
  }

  /**
   * Wait till the job is finished
   */
  public done(): Promise<QueueJob<T>> {
    return new Promise((resolve, reject) => {
      if (!this._stop) {
        this._queue.once(this.jobEventName('stop'), (err: Error = null) => {
          if (err) {
            reject(err);
          } else {
            resolve(this);
          }
        });
      } else {
        // if stopped then pass through
        resolve(this);
      }
    });
  }

  /**
   * Fire event that the job was enqueued
   */
  public doEnqueue() {
    this._enqueued = new Date();
    this._queue.emit(this.jobEventName('enqueued'), this);
  }

  /**
   * Fire event that the job was started
   */
  public doStart() {
    this._start = new Date();
    this._queue.emit(this.jobEventName('start'));
  }

  /**
   * Fire event that the job was stopped
   */
  public doStop(err: Error = null) {
    this._error = err;
    this._stop = new Date();
    this._duration = this._stop.getTime() - this._start.getTime();
    this._queue.emit(this.jobEventName('stop'), err);
  }

  /**
   * Check if the job is enqueued
   */
  public isEnqueued(): boolean {
    return this._enqueued != null && this._start == null && this._stop == null;
  }

  /**
   * Check if the job is started
   */
  public isStarted(): boolean {
    return this._enqueued != null && this._start != null && this._stop == null;
  }

  /**
   * Check if the job is finished
   */
  public isFinished(): boolean {
    return this._enqueued != null && this._start != null && this._stop != null;
  }


  /**
   * Fired when the job is finished
   */
  private onDone() {
    this.finalize();
  }


  /**
   * Clear references to the _queue object
   */
  finalize() {
    if (!this._stop) {
      this.doStop();
    }
    this._queue.removeAllListeners(this.jobEventName('start'));
    this._queue.removeAllListeners(this.jobEventName('stop'));
    this._queue.removeAllListeners(this.jobEventName('enqueued'));
    this._queue = null;
  }


  /**
   * Helper generating the event names for different jobs id and states
   *
   * @param type
   */
  private jobEventName(type: 'start' | 'stop' | 'enqueued') {
    return `job ${this._id} ${type}`;
  }

}
