import * as _ from 'lodash';
import {EventEmitter} from 'events';
import {System} from '../../libs/system/System';
import {ILoggerApi} from '../../libs/logging/ILoggerApi';
import {EventBus, subscribe, unsubscribe} from 'commons-eventbus';
import {ClassType} from '@allgemein/schema-api';
import {IMessageOptions} from './IMessageOptions';
import {AbstractEvent} from './AbstractEvent';
import {Log} from '../../libs/logging/Log';
import {K_NODE_ID} from './Constants';


export abstract class AbstractMessage<REQ extends AbstractEvent, RES extends AbstractEvent> extends EventEmitter {

  protected system: System;

  protected request: REQ;

  protected responses: RES[] = [];

  protected targetIds: string[];

  /**
   * Detect targets
   *
   * @protected
   */
  protected detectTargets: boolean;

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
      this.detectTargets = false;
      options.targetIds.forEach(x => {
        this.target(x);
      });
    } else {
      this.detectTargets = true;
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

  getLocalNodeId() {
    return this.getSystem().getNodeId();
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
    this.targetIds = !!this.targetIds ? this.targetIds : [];
    if (_.isEmpty(this.targetIds)) {
      this.targetIds = this.getSystem().nodes.map(n => n.nodeId);
    }

    const myNodeId = this.getSystem().node.nodeId;
    this.request = req || Reflect.construct(this.getReqClass(), []);
    this.request.nodeId = myNodeId;
    this.request.targetIds = _.uniq(this.targetIds);

    // remove self from target list
    // _.remove(this.targetIds, x => x === myNodeId);

    if (this.beforeSend) {
      await this.beforeSend(this.request);
    }

    // when no targets given, we don't know for how many worker we should listen
    if (!this.targetIds || _.isEmpty(this.targetIds)) {
      if (_.isUndefined(this.options.waitIfNoTarget) ||
        !_.get(this.options, 'waitIfNoTarget', false)) {
        const ready = this.ready();
        this.emit('postprocess');
        this.results = await ready;
        return this.results;
      }
    }

    subscribe(this.getResClass())(this, 'onResults');

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

    res[K_NODE_ID] = res.nodeId;
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
