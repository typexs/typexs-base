import * as _ from 'lodash';
import {ClassType} from 'commons-schema-api';
import {AbstractEvent} from './AbstractEvent';
import {System} from '../../libs/system/System';
import {Inject} from 'typedi';
import {IMessageOptions, Message} from './Message';
import {EventBus, subscribe} from 'commons-eventbus';
import {ILoggerApi} from '../../libs/logging/ILoggerApi';
import {Log} from '../../libs/logging/Log';

export abstract class AbstractExchange<REQ extends AbstractEvent, RES extends AbstractEvent> {

  @Inject(System.NAME)
  private system: System;

  readonly reqCls: ClassType<REQ>;

  readonly resCls: ClassType<RES>;

  logger: ILoggerApi = Log.getLogger();

  constructor(reqCls: ClassType<REQ>, resCls: ClassType<RES>) {
    this.reqCls = reqCls;
    this.resCls = resCls;
    subscribe(this.getReqClass())(this, 'onRequest');
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

  async onRequest(request: REQ) {
    const response: RES = Reflect.construct(this.getResClass(), []);
    response.reqEventId = request.id;
    response.of(this.getSystem().node);
    response.targetIds = [request.nodeId];
    try {
      await this.handleRequest(request, response);
    } catch (err) {
      this.logger.error(err);
      response.error = err.message;
    }
    return EventBus.postAndForget(response);
  }


  abstract handleRequest(request: REQ, response: RES): void;


  abstract handleResponse(responses: RES, err: Error): any;

}
