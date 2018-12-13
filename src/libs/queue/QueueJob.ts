import {IQueueWorkload} from "./IQueueWorkload";
import {IQueue} from "./IQueue";

import {CryptUtils} from "../utils/CryptUtils";
import Timer = NodeJS.Timer;


export class QueueJob<T extends IQueueWorkload> {

  private static _INC = 0;
  private _TIMEOUT = 20000;

  private _id: string;

  private _queue: IQueue;

  private _workload: T;

  private _start: Date = null;
  private _stop: Date = null;
  private _enqueued: Date = null;
  private _duration: number;
  private _error:Error = null;

  private _result: any = null;

  // create a timer which destroy long running jobs
  private _timer: Timer = null;

  constructor(queue: IQueue, workload: T) {
    this._workload = workload;
    this._queue = queue;
    this._id = CryptUtils.shorthash((new Date()).getTime() + '' + (QueueJob._INC++));
    /*
     this._queue.once('job '+this._id+' start',this.onStart.bind(this));
     this._queue.once('job '+this._id+' start',this.onStart.bind(this));

     */
    this._queue.once('job ' + this._id + ' stop', this.onDone.bind(this))
  }

  public get id(): string {
    return this._id
  }

  public workload(): T {
    return this._workload
  }

  public enqueued(): Promise<QueueJob<T>> {
    let self = this;
    return new Promise(function (resolve) {
      if (!self._enqueued) {
        self._queue.once('job ' + self.id + ' enqueued', function (job: QueueJob<T>) {
          resolve(job)
        })
      } else {
        resolve(self)
      }
    })
  }

  getResult(){
    return this._result;
  }

  setResult(v:any) {
    this._result = v;
  }

  getError(){
    return this._error;
  }

  public starting(): Promise<QueueJob<T>> {
    let self = this;
    return new Promise(function (resolve) {
      if (!self._start) {
        self._queue.once('job ' + self.id + ' start', function () {
          resolve(self)
        })
      } else {
        // if started then pass through
        resolve(self)
      }
    })
  }

  public done(): Promise<QueueJob<T>> {
    return new Promise( (resolve,reject) => {
      if (!this._stop) {
        this._queue.once('job ' + this.id + ' stop', function (err:Error = null) {
          if(err){
            reject(err);
          }else{
            resolve(this)
          }
        })
      } else {
        // if stopped then pass through
        resolve(this)
      }
    })
  }

  public doEnqueue() {
    this._enqueued = new Date();
    this._queue.emit('job ' + this._id + ' enqueued', this)
  }

  public doStart() {
    this._start = new Date();
    this._queue.emit('job ' + this._id + ' start')
  }

  public doStop(err:Error = null) {
    this._error = err;
    this._stop = new Date();
    this._duration = this._stop.getTime() - this._start.getTime();
    this._queue.emit('job ' + this._id + ' stop',err);
  }

  public isEnqueued(): boolean {
    return this._enqueued != null && this._start == null && this._stop == null
  }

  public isStarted(): boolean {
    return this._enqueued != null && this._start != null && this._stop == null
  }

  public isFinished(): boolean {
    return this._enqueued != null && this._start != null && this._stop != null
  }

  private onDone() {
    this.finalize()
  }


  private finalize() {
    this._queue.removeAllListeners('job ' + this._id + ' start');
    this._queue.removeAllListeners('job ' + this._id + ' stop');
    this._queue.removeAllListeners('job ' + this._id + ' enqueued');

  }


}
