import {AbstractEvent} from './AbstractEvent';
import {AsyncWorkerQueue, Bootstrap, ILoggerApi, IQueueProcessor, IQueueWorkload, IWorker, Log, System} from '../..';
import {Inject} from 'typedi';
import * as _ from 'lodash';
import {EventBus, subscribe} from 'commons-eventbus';
import {IWorkerStatisitic} from '../worker/IWorkerStatisitic';
import {AbstractExchange} from './AbstractExchange';
import {Config} from 'commons-config';
import {ClassLoader, TreeUtils, WalkValues} from 'commons-base';

const filterKeys = ['password', 'pass', 'credential', 'credentials', 'secret',
  'token'];

export class ConfigRequest extends AbstractEvent {

  key: string = null;

}

export class ConfigResponse extends AbstractEvent {

  value: any;


}


export class ConfigExchange extends AbstractExchange<ConfigRequest, ConfigResponse> {

  reqCls = ConfigRequest;

  resCls = ConfigResponse;


  async key(key: string, opts: { nodeIds?: string[] } = {}) {
    const r = new ConfigRequest();
    r.key = key;
    const msg = this.create(_.get(opts, 'nodeIds', []));
    return await msg.run(r);
  }


  handleRequest(request: ConfigRequest, res: ConfigResponse) {
    let _orgCfg: any = {};
    if (!_.isEmpty(request) && !_.isEmpty(request.key)) {
      _orgCfg = Config.get(request.key);
    } else {
      _orgCfg = Config.get();
    }

    const cfg = _.cloneDeepWith(_orgCfg);
    const _filteredKeys = _.concat(filterKeys, Config.get('config.hide.keys', []));

    TreeUtils.walk(cfg, (x: WalkValues) => {
      // TODO make this list configurable! system.info.hide.keys!
      if (_.isString(x.key) && _filteredKeys.indexOf(x.key) !== -1) {
        delete x.parent[x.key];
      }
      if (_.isFunction(x.value)) {
        if (_.isArray(x.parent)) {
          x.parent[x.index] = ClassLoader.getClassName(x.value);
        } else {
          x.parent[x.key] = ClassLoader.getClassName(x.value);
        }
      }
    });
    res.value = cfg;
  }


  handleResponse(responses: ConfigResponse): any {
    return responses.value;
  }
}

export interface IMessageWorkload extends IQueueWorkload {

  /**
   * Received event
   */
  event: AbstractEvent;

}


export class MessageWorker implements IQueueProcessor<IMessageWorkload>, IWorker {

  @Inject(System.NAME)
  private system: System;


  name = 'message_worker';

  nodeId: string;

  queue: AsyncWorkerQueue<IMessageWorkload>;

  logger: ILoggerApi;

  messageRequestTypes: AbstractExchange<any, any>[] = [];

  private options: any;

  async prepare(options: any = {name: 'message_worker_queue'}) {
    this.options = _.defaults(options, {onlyRemote: false, allowed: {}});
    this.logger = _.get(this.options, 'logger', Log.getLoggerFor(MessageWorker));
    this.nodeId = Bootstrap.getNodeId();
    this.queue = new AsyncWorkerQueue<IMessageWorkload>(this, {...options, logger: this.logger});
    await EventBus.register(this);
    this.logger.debug('waiting for requests ...');

    // get defined message exchanges
  }


  registerExchange(x: AbstractExchange<any, any>) {
    this.messageRequestTypes.push(x);
    subscribe(x.getReqClass())(this, 'onRequest');
  }

  onRequest(event: AbstractEvent) {
    // todo check
    try {
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
      const exchange = this.messageRequestTypes.find(x => workLoad.event instanceof x.getReqClass());
      if (exchange) {
        return exchange.onRequest(workLoad.event);
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
    await EventBus.unregister(this);
    this.queue.removeAllListeners();
  }

}
