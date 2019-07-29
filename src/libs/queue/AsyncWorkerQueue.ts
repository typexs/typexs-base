import * as _ from 'lodash';
import * as events from 'events';
import {IAsyncQueueOptions} from './IAsyncQueueOptions';
import {IQueueProcessor} from './IQueueProcessor';
import {IQueueWorkload} from './IQueueWorkload';
import {QueueJob} from './QueueJob';
import {Log} from '../logging/Log';
import {IAsyncQueueStats} from './IAsyncQueueStats';
import {ILoggerApi} from '../logging/ILoggerApi';


const ASYNC_QUEUE_DEFAULT: IAsyncQueueOptions = {
  name: 'none',
  concurrent: 5
};

export class AsyncWorkerQueue<T extends IQueueWorkload> extends events.EventEmitter {

  static readonly E_NO_RUNNING_JOBS = 'running empty';
  static readonly E_DO_PROCESS = 'process';
  static readonly E_DRAIN = 'drain';
  static readonly E_ENQUEUE = 'enqueue';

  _inc = 0;

  _done = 0;

  _error = 0;

  _paused = false;

  options: IAsyncQueueOptions;

  processor: IQueueProcessor<T>;

  runningTasks = 0;

  worker: Array<QueueJob<T>> = [];

  active: Array<QueueJob<T>> = [];

  logger: ILoggerApi;

  constructor(processor: IQueueProcessor<T>, options: IAsyncQueueOptions = {name: 'none'}) {
    super();
    this.setMaxListeners(1000);
    this.options = _.defaults(options, ASYNC_QUEUE_DEFAULT);
    this.logger = _.get(this.options, 'logger', Log.getLoggerFor(AsyncWorkerQueue, {prefix: this.options.name}));
    this.processor = processor;
    this.on(AsyncWorkerQueue.E_DO_PROCESS, this.process.bind(this));
    this.on(AsyncWorkerQueue.E_ENQUEUE, this.enqueue.bind(this));
    this.on(AsyncWorkerQueue.E_DRAIN, this.drained.bind(this));
  }

  private next() {
    this.runningTasks--;

    this.logger.debug('inc=' + this._inc + ' done=' + this._done + ' error=' + this._error +
      ' running=' + this.running() + ' todo=' + this.enqueued() + ' active=' + this.active.length);
    if (this.isPaused()) {
      if (!this.isRunning()) {
        this.emit(AsyncWorkerQueue.E_NO_RUNNING_JOBS);
      }
    } else {
      this.fireProcess();
    }

  }

  status(): IAsyncQueueStats {
    return {
      all: this._inc,
      done: this._done,
      running: this.running(),
      enqueued: this.enqueued(),
      active: this.active.length
    };
  }

  private paused() {

  }

  private process() {
    // ignore if is paused
    if (this._paused) {
      return;
    }

    if (!this.isOccupied() && this.enqueued() > 0) {
      // room for additional job
      const worker = this.worker.shift();
      const self = this;
      self.active.push(worker);

      this.runningTasks++;
      Promise.resolve(worker)
        .then((_worker) => {
          self._inc++;
          _worker.doStart();
          return _worker;
        })
        .then(async (_worker) => {
          const res = await self.processor.do(_worker.workload(), self);
          _worker.setResult(res);
          return _worker;
        })
        .then((_worker) => {
          _.remove(self.active, _worker);
          _worker.doStop();
          self._done++;
          self.next();
        })
        .catch((err) => {
          _.remove(self.active, worker);
          worker.doStop(err);
          self._error++;
          self.next();
          this.logger.error('Queue=>', err);
        });

    } else {
      if (this.amount() === 0) {
        // notthing to do
        this.emit(AsyncWorkerQueue.E_DRAIN);
      } else {
        // worker exists and occupied
      }
    }
  }


  private enqueue(job: QueueJob<T>) {
    this.worker.push(job);
    job.doEnqueue();
    this.fireProcess();
  }

  private drained() {
    if (this.processor.onEmpty) {
      this.processor.onEmpty();
    }
  }

  private fireProcess() {
    this.emit(AsyncWorkerQueue.E_DO_PROCESS);
  }


  /**
   * all processed queue is empty
   */
  await(): Promise<void> {
    const self = this;

    return new Promise<void>(function (resolve) {
      if (self.amount() > 0) {
        self.once(AsyncWorkerQueue.E_DRAIN, function () {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }


  /**
   * Creates a new QueueJob for passed entry and return a promise which that the job will be enqueued
   *
   * @param entry
   * @returns {QueueJob<T>}
   */
  push(entry: T): QueueJob<T> {
    const _entry: QueueJob<T> = new QueueJob(this, entry);
    // let $p = _entry.enqueued();
    this.emit(AsyncWorkerQueue.E_ENQUEUE, _entry);
    return _entry;
  }


  running() {
    return this.runningTasks;
  }


  enqueued() {
    return this.worker.length;
  }

  amount() {
    return this.running() + this.enqueued();
  }

  isPaused() {
    return this._paused;
  }

  isRunning() {
    return this.runningTasks > 0;
  }

  isIdle() {
    return this.enqueued() + this.runningTasks === 0;
  }

  isOccupied() {
    return this.runningTasks >= this.options.concurrent;
  }

// TODO impl
  pause(): Promise<boolean> {
    const self = this;
    this._paused = true;
    return new Promise(function (resolve) {
      if (self.isRunning()) {
        self.once(AsyncWorkerQueue.E_NO_RUNNING_JOBS, function () {
          resolve(self._paused);
        });
      } else {
        resolve(self._paused);
      }
    });
  }

// TODO impl
  resume() {
    this._paused = false;
    for (let i = 0; i < this.options.concurrent; i++) {
      this.fireProcess();
    }
  }


}
