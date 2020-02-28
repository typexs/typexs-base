// import { AsyncWorkerQueue, Bootstrap, ILoggerApi, IQueueProcessor, IWorker, Log, System} from '../..';

import {AbstractEvent} from './../libs/messaging/AbstractEvent';

import {Inject} from 'typedi';
import {AbstractExchange} from './../libs/messaging/AbstractExchange';
import * as _ from 'lodash';
import {EventBus, subscribe, unsubscribe} from 'commons-eventbus';
import {IWorkerStatisitic} from './../libs/worker/IWorkerStatisitic';

import {IWorker} from './../libs/worker/IWorker';
import {IQueueProcessor} from '../libs/queue/IQueueProcessor';
import {System} from '../libs/system/System';
import {AsyncWorkerQueue} from '../libs/queue/AsyncWorkerQueue';
import {ILoggerApi} from '../libs/logging/ILoggerApi';
import {Bootstrap} from '../Bootstrap';
import {Log} from '../libs/logging/Log';
import {IMessageWorkload} from '../libs/messaging/IMessageWorkload';
import {ExchangeMessageRegistry} from '../libs/messaging/ExchangeMessageRegistry';
import {ClassUtils} from 'commons-base';


export class ExchangeMessageWorker implements IQueueProcessor<IMessageWorkload>, IWorker {

  @Inject(System.NAME)
  private system: System;

  @Inject(ExchangeMessageRegistry.NAME)
  private messageRegistry: ExchangeMessageRegistry;

  name = 'message_worker';

  nodeId: string;

  queue: AsyncWorkerQueue<IMessageWorkload>;

  logger: ILoggerApi;

  private options: any;

  async prepare(options: any = {name: 'message_worker_queue'}) {
    this.options = _.defaults(options, {onlyRemote: false, allowed: {}});
    this.logger = _.get(this.options, 'logger', Log.getLoggerFor(ExchangeMessageWorker));
    this.nodeId = Bootstrap.getNodeId();
    this.queue = new AsyncWorkerQueue<IMessageWorkload>(this, {...options, logger: this.logger});
    for (const messageRef of this.messageRegistry.getEntries()) {
      await messageRef.getExchange().prepare();
      this.register(messageRef.getExchange());
    }
    await EventBus.register(this);
    this.logger.debug('waiting for requests ...');
  }


  async register(x: AbstractExchange<any, any>) {
    try {
      this.logger.debug('register ' + ClassUtils.getClassName(<any>x));
      await EventBus.register(x);
      // try {
      // //   await EventBus.unregister(this);
      // } catch (e) {
      // }
      subscribe(x.getReqClass())(this, 'onRequest');
    } catch (e) {
      this.logger.error(e);
    }
  }


  async unregister(x: AbstractExchange<any, any>) {
    try {
      await EventBus.unregister(x);
    } catch (e) {
    }
    unsubscribe(this, x.getReqClass(), 'onRequest');
    // try {
    //   await EventBus.register(this);
    // } catch (e) {
    //
    // }
  }


  onRequest(event: AbstractEvent) {
    // todo check
    try {
      this.logger.debug('event: ' + event.id + ' ' + event.reqEventId + ' ' + event.targetIds);
      // check if its for me
      if (event.targetIds && event.targetIds.indexOf(this.system.node.nodeId) === -1) {
        return;
      }

      const q: IMessageWorkload = {
        event: event
      };
      this.queue.push(q);
    } catch (err) {
      this.logger.error(err);
    }
  }


  do(workLoad: IMessageWorkload) {
    if (workLoad.event) {
      const exchange = this.messageRegistry.findForRequest(workLoad.event);
      if (exchange) {
        return exchange.getExchange().onRequest(workLoad.event);
      }
    }
    return null;
  }


  statistic(): IWorkerStatisitic {
    const stats: IWorkerStatisitic = {
      stats: this.queue.status(),
      paused: this.queue.isPaused(),
      idle: this.queue.isIdle(),
      occupied: this.queue.isOccupied(),
      running: this.queue.isPaused(),
    };

    return stats;
  }


  async finish() {

    for (const messageRef of this.messageRegistry.getEntries()) {
      this.unregister(messageRef.getExchange());
    }
    try {
      await EventBus.unregister(this);
    } catch (e) {

    }

    this.queue.removeAllListeners();
  }

}
