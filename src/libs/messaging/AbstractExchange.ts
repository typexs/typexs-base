import * as _ from 'lodash';
import {ClassType} from '@allgemein/schema-api';
import {AbstractEvent} from './AbstractEvent';
import {System} from '../../libs/system/System';
import {Inject} from 'typedi';
import {Message} from './Message';
import {EventBus, subscribe} from 'commons-eventbus';
import {ILoggerApi} from '../../libs/logging/ILoggerApi';
import {Log} from '../../libs/logging/Log';
import {IMessageOptions} from './IMessageOptions';


export abstract class AbstractExchange<REQ extends AbstractEvent, RES extends AbstractEvent> {

  private reqCache: { [k: string]: boolean } = {};

  @Inject(System.NAME)
  private system: System;

  readonly reqCls: ClassType<REQ>;

  readonly resCls: ClassType<RES>;

  logger: ILoggerApi = Log.getLogger();

  constructor(reqCls: ClassType<REQ>, resCls: ClassType<RES>) {
    this.reqCls = reqCls;
    this.resCls = resCls;

  }

  prepare(opts: any = {}) {
    subscribe(this.getReqClass())(this, 'onRequest');
  }

  /**
   * Give possiblity to mark this exchange as disabled
   */
  isActive() {
    return true;
  }


  getSystem() {
    return this.system;
  }


  getReqClass() {
    return this.reqCls;
  }


  getResClass() {
    return this.resCls;
  }


  create(options: IMessageOptions = {}): Message<REQ, RES> {
    const msg = new Message(this, options);
    return msg;
  }

  async getResponse(request: REQ) {
    const response: RES = Reflect.construct(this.getResClass(), []);
    response.reqEventId = request.id;
    response.of(this.getSystem().node);
    response.targetIds = [request.nodeId];
    try {
      await this.handleRequest(request, response);
    } catch (err) {
      response.error = err;
    }
    return response;
  }


  async onRequest(request: REQ) {
    if (!_.isEmpty(request.targetIds) && !request.targetIds.includes(this.getSystem().node.nodeId)) {
      // process request only if it is mine
      return;
    }
    if (this.reqCache[request.id]) {
      return;
    }
    this.reqCache[request.id] = true;
    const response = await this.getResponse(request);
    if (response.error) {
      this.logger.error(response.error);
      response.error = {
        name: response.error.name,
        message: response.error.message
      };
    }
    delete this.reqCache[request.id];
    return EventBus.postAndForget(response);
  }


  abstract handleRequest(request: REQ, response: RES): void;


  abstract handleResponse(responses: RES, err: Error): any;

}
