import {EventEmitter} from 'events';
import {System} from '../../libs/system/System';
import * as _ from 'lodash';
import {ILoggerApi} from '../../libs/logging/ILoggerApi';
import {EventBus, subscribe, unsubscribe} from 'commons-eventbus';
import {ClassType} from 'commons-schema-api';
import {IMessageOptions} from './IMessageOptions';
import {AbstractEvent} from './AbstractEvent';
import {Log} from '../logging/Log';


export abstract class AbstractMessage<REQ extends AbstractEvent, RES extends AbstractEvent> extends EventEmitter {

  protected system: System;

  protected request: REQ;

  protected responses: RES[] = [];

  // protected nodeIds: string[] = [];

  protected targetIds: string[];

  protected results: any | any[];

  protected active = true;

  protected timeout = 5000;

  protected logger: ILoggerApi;

  protected start: Date;

  protected stop: Date;

  protected readonly reqClass: ClassType<REQ>;

  protected readonly resClass: ClassType<RES>;

  protected options: IMessageOptions;

  constructor(system: System,
              reqClass: ClassType<REQ>,
              resClass: ClassType<RES>,
              options: IMessageOptions = {}) {
    super();
    this.system = system;
    this.reqClass = reqClass;
    this.resClass = resClass;
    this.logger = _.get(options, 'logger', Log.getLogger());
    if (options.targetIds && _.isArray(options.targetIds)) {
      options.targetIds.forEach(x => {
        this.target(x);
      });
    }
    this.options = options;
    _.defaults(this.options, {
      filter: (x: any) => !!x
    });
    this.once('postprocess', this.postProcess.bind(this));
  }


  target(nodeId: string) {
    if (!this.targetIds) {
      this.targetIds = [];
    }
    this.targetIds.push(nodeId);
    return this;
  }

  abstract doPostProcess(responses: RES[], err?: Error): any;


  getSystem() {
    return this.system;
  }

  getReqClass() {
    return this.reqClass;
  }

  getResClass() {
    return this.resClass;
  }


  beforeSend?(req: REQ): void {
  }


  async send(req: REQ): Promise<any[]> {
    this.start = new Date();
    if (_.isUndefined(this.targetIds) || _.isEmpty(this.targetIds)) {
      this.targetIds = this.getSystem().nodes.map(n => n.nodeId);
    }
    this.request = req || Reflect.construct(this.getReqClass(), []);
    this.request.nodeId = this.getSystem().node.nodeId;
    this.request.targetIds = _.uniq(this.targetIds);

    if (this.beforeSend) {
      await this.beforeSend(this.request);
    }

    subscribe(this.getResClass())(this, 'onResults');

    this.logger.debug('REQ: ' +
      this.getSystem().node.nodeId + ' => ' +
      this.request.id + ' ' + this.request.targetIds);
    await EventBus.register(this);
    const ready = this.ready();
    await EventBus.postAndForget(this.request);
    this.results = await ready;
    try {
      await EventBus.unregister(this);
    } catch (e) {
    }
    return this.results;
  }


  async postProcess(err: Error = null) {
    this.stop = new Date();
    let error = null;
    let result = null;

    let responses: RES[] = this.responses;
    if (this.options.filterErrors) {
      responses = responses.filter(x => !x.error);
    }

    if (this.options.filter) {
      responses = responses.filter(x => this.options.filter(x));
    }

    try {
      if (this.options.outputMode === 'responses') {
        result = responses;
      } else {
        result = await this.doPostProcess(responses, err);
      }
    } catch (e) {
      error = e;
    }

    this.emit('finished', error, result);
  }


  /**
   * Overrideable method to additionaly check if response is valid.
   *
   * If false the response will be ignored in onResults.
   *
   * @param res
   */
  requestCheck(res: RES) {
    return true;
  }


  onResults(res: RES) {
    if (!this.active) {
      return;
    }

    this.logger.debug('RES: ' +
      this.request.id + ' ' + res.respId + '=>' + res.id +
      ' [reqId=' + res.reqEventId + ']');

    // has query req
    if (!this.request || res.reqEventId !== this.request.id) {
      return;
    }

    // results for me?
    if (res.targetIds.indexOf(this.getSystem().node.nodeId) === -1) {
      return;
    }

    // waiting for the results?
    if (this.targetIds.indexOf(res.nodeId) === -1) {
      return;
    }

    if (!this.requestCheck(res)) {
      return;
    }

    _.remove(this.targetIds, x => x === res.nodeId);

    res['__nodeId__'] = res.nodeId;
    if (!res.skipping) {
      this.responses.push(res);
    }

    if (this.targetIds.length === 0) {
      this.active = false;
      this.emit('postprocess');
    }
  }


  ready() {
    const self = this;
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.emit('postprocess', new Error('timeout error [' + this.timeout +
          '] after duration of ' + (Date.now() - this.start.getTime()) + 'ms'));
        clearTimeout(t);
      }, this.timeout);

      this.once('finished', (err: Error, data: any) => {
        // as long eventbus has no unregister
        unsubscribe(this, this.getResClass(), 'onResults');
        clearTimeout(t);
        this.logger.debug('finished duration=' + (this.stop.getTime() - this.start.getTime()) + 'ms');
        if (err) {
          this.logger.error(err);

          if (_.isArray(err)) {
            this.logger.error(...err);
          } else {
            this.logger.error(err);
          }

          if (data) {
            resolve(data);
          } else {
            reject(err);
          }
        } else {
          resolve(data);
        }
      });

    });
  }


}
