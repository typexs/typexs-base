// Reference @testdeck/mocha's global definitions:

import {suite, test, slow, timeout, pending} from '@testdeck/mocha';
import {expect} from 'chai';
import {IQueueWorkload} from '../../../src/libs/queue/IQueueWorkload';
import {IQueueProcessor} from '../../../src/libs/queue/IQueueProcessor';
import {AsyncWorkerQueue} from '../../../src/libs/queue/AsyncWorkerQueue';
import {QueueJob} from '../../../src/libs/queue/QueueJob';

// describe('',() => {})

// (function(){})()

class Workload implements IQueueWorkload {

}


class Processor implements IQueueProcessor<Workload> {

  do(workLoad: Workload): Promise<void> {
    // doing something with the workload
    return new Promise<void>(function (resolve) {
      setTimeout(function () {
        resolve();
      }, 100);
    });
  }


  onEmpty(): Promise<void> {
    return null;
  }
}


@suite('functional/queue/async')
class AsyncQueueTests {


  @test
  async enqueueSingleWorkloadAndWaitUntilAllDone() {
    const p = new Processor();
    const q = new AsyncWorkerQueue<Workload>(p);
    await q.pause();
    expect(q.isPaused()).to.eq(true);

    q.push(new Workload());
    q.resume();
    expect(q.isPaused()).to.eq(false);
    expect(q.amount()).to.eq(1);

    await q.await();
    expect(q.amount()).to.eq(0);
  }


  @test
  async enqueueMultipleWorkloadAndWaitUntilAllDone() {
    const parallel: number = 5;
    const p = new Processor();
    const q = new AsyncWorkerQueue<Workload>(p, {name: 'enqueue_test', concurrent: parallel});

    for (let i = 0; i < 20; i++) {
      q.push(new Workload());
      expect(q.amount()).to.greaterThan(0);
      expect(q.running()).to.lessThan(parallel + 1);
    }

    await q.await();
    expect(q.running()).to.eq(0);
    expect(q.enqueued()).to.eq(0);
    expect(q.amount()).to.eq(0);
  }

  @test
  async enqueueSingleWorkloadAndWaitUntilWorkIsDone() {
    const p = new Processor();
    const q = new AsyncWorkerQueue<Workload>(p);
    await q.pause();
    expect(q.isPaused()).to.eq(true);

    const job: QueueJob<Workload> = await q.push(new Workload());
    expect(q.amount()).to.eq(1);
    expect(job.isEnqueued()).to.eq(true);
    expect(job.isStarted()).to.eq(false);
    expect(job.isFinished()).to.eq(false);
    q.resume();
    expect(q.isPaused()).to.eq(false);

    await job.starting();
    expect(job.isEnqueued()).to.eq(false);
    expect(job.isStarted()).to.eq(true);
    expect(job.isFinished()).to.eq(false);

    await job.done();
    expect(job.isEnqueued()).to.eq(false);
    expect(job.isStarted()).to.eq(false);
    expect(job.isFinished()).to.eq(true);
    expect(q.amount()).to.eq(0);
  }

}
