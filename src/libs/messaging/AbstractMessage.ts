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

  protected nodeIds: string[] = [];

  protected targetIds: string[];

  protected results: any | any[] = [];

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
    if (options.nodeIds && _.isArray(options.nodeIds)) {
      options.nodeIds.forEach(x => {
        this.target(x);
      });
    }
    this.options = options;
    this.once('postprocess', this.postProcess.bind(this));
  }


  target(nodeId: string) {
    this.nodeIds.push(nodeId);
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


  // async run(...args: any[]) {
  //   this.start = new Date();
  //
  //   // ....
  //
  //
  //   // register as bus
  //   await EventBus.register(this);
  //   Log.debug('fire query event with id: ' + this.saveEvent.queryId + ' to targets ' + this.targetIds.join(', '));
  //
  //   try {
  //     this.start = new Date();
  //     await Promise.all([this.ready(), EventBus.postAndForget(this.saveEvent)]);
  //   } catch (err) {
  //     Log.error(err);
  //   }
  //
  //   await EventBus.unregister(this);
  //   this.removeAllListeners();
  // }

  beforeRun?(req: REQ): void {
  }

  async send(req: REQ): Promise<any[]> {
    this.start = new Date();
    if (_.isEmpty(this.targetIds) && this.nodeIds.length === 0) {
      this.targetIds = this.getSystem().nodes.map(n => n.nodeId);
    }

    if (this.beforeRun) {
      await this.beforeRun(req);
    }

    this.request = req || Reflect.construct(this.getReqClass(), []);
    this.request.nodeId = this.getSystem().node.nodeId;
    this.request.targetIds = _.uniq(this.targetIds);
    subscribe(this.getResClass())(this, 'onResults');

    this.logger.debug('REQ: ' + this.getSystem().node.nodeId + ' => ' + this.request.id + ' ' + this.request.targetIds);
    await EventBus.register(this);
    await Promise.all([this.ready(), EventBus.postAndForget(this.request)]);
    // await EventBus.postAndForget(this.req);
    // await this.ready();
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
      responses = this.responses.filter(x => !x.error);
    }

    try {
      result = await this.doPostProcess(responses, err);
    } catch (e) {
      error = e;
    }

    this.emit('finished', error, result);
  }


  onResults(res: RES) {
    if (!this.active) {
      return;
    }

    this.logger.debug('RES: ' + this.getSystem().node.nodeId + ' => ' + this.request.id + ' ' + res.reqEventId);

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

  //
  //
  // ready() {
  //   return new Promise((resolve, reject) => {
  //     const t = setTimeout(() => {
  //       this.emit('postprocess', new Error('timeout error [' + this.timeout +
  //         '] after duration of ' + (Date.now() - this.start.getTime()) + 'ms'));
  //       clearTimeout(t);
  //     }, this.timeout);
  //
  //     this.once('finished', (err: Error | Error[], data: any) => {
  //       clearTimeout(t);
  //       this.logger.debug('finished duration=' + (this.stop.getTime() - this.start.getTime()) + 'ms');
  //
  //
  //       if (!_.isEmpty(err)) {
  //         if (_.isArray(err)) {
  //           this.logger.error(...err);
  //         } else {
  //           this.logger.error(err);
  //         }
  //         if (!_.isEmpty(data)) {
  //           resolve(data);
  //         } else {
  //           reject(err);
  //         }
  //       } else {
  //         resolve(data);
  //       }
  //     });
  //
  //   });
  // }


}
