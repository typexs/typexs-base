import * as _ from 'lodash';
import {AbstractEvent} from './AbstractEvent';
import {AbstractExchange} from './AbstractExchange';
import {IMessageOptions} from './IMessageOptions';
import {AbstractMessage} from './AbstractMessage';


export class Message<REQ extends AbstractEvent, RES extends AbstractEvent>
  extends AbstractMessage<REQ, RES> {

  // private timeout = 5000;
  //
  // private request: REQ;
  //
  // private responses: RES[] = [];
  //
  // private nodeIds: string[] = [];
  //
  // private targetIds: string[];
  //
  // private results: any = [];
  //
  // private active = true;

  private factory: AbstractExchange<REQ, RES>;

  // private options: IMessageOptions = {};

  constructor(factory: AbstractExchange<REQ, RES>, options: IMessageOptions = {}) {
    super(factory.getSystem(),
      factory.getReqClass(),
      factory.getResClass(), {...options, logger: factory.logger});
    // this.options = options;
    this.factory = factory;
    // if (options.nodeIds && _.isArray(options.nodeIds)) {
    //   options.nodeIds.forEach(x => {
    //     this.target(x);
    //   });
    // }
    //
    // this.once('postprocess', this.postProcess.bind(this));
  }

  async beforeRun(req: REQ) {
    if (_.isUndefined(this.options.skipLocal) ||
      !_.get(this.options, 'skipLocal', false)) {
      const localResponse = await this.factory.getResponse(req);
      this.responses.push(localResponse);
    }
  }

  //
  // target(nodeId: string) {
  //   this.nodeIds.push(nodeId);
  //   return this;
  // }
  //
  //
  // async run(req: REQ): Promise<RES[]> {
  //   if (this.nodeIds.length === 0) {
  //     this.targetIds = this.factory.getSystem().nodes.map(n => n.nodeId);
  //   }
  //
  //
  //   if (_.isUndefined(this.options.skipLocal) ||
  //     !_.get(this.options, 'skipLocal', false)) {
  //     const localResponse = await this.factory.getResponse(req);
  //     this.responses.push(localResponse);
  //   }
  //
  //   this.request = req || Reflect.construct(this.factory.getReqClass(), []);
  //   this.request.nodeId = this.factory.getSystem().node.nodeId;
  //   this.request.targetIds = _.uniq(this.targetIds);
  //   subscribe(this.factory.getResClass())(this, 'onResults');
  //
  //   this.factory.logger.debug('REQ: ' + this.factory.getSystem().node.nodeId + ' => ' + this.request.id + ' ' + this.request.targetIds);
  //   await EventBus.register(this);
  //   await Promise.all([this.ready(), EventBus.postAndForget(this.request)]);
  //   // await EventBus.postAndForget(this.req);
  //   // await this.ready();
  //   try {
  //     await EventBus.unregister(this);
  //   } catch (e) {
  //   }
  //   return this.results;
  // }


  // postProcess(err: Error) {
  //   let responses: RES[] = this.responses;
  //   if (this.options.filterErrors) {
  //     responses = this.responses.filter(x => !x.error);
  //   }
  //
  //   try {
  //     switch (this.options.outputMode) {
  //       case 'embed_nodeId':
  //         this.results = responses.map(x => {
  //           let y: any = null;
  //           if (x.error) {
  //             y = new Error(x.error.message);
  //           } else {
  //             y = this.factory.handleResponse(x, err);
  //           }
  //           y['__nodeId__'] = x.nodeId;
  //           y['__instNr__'] = x.instNr;
  //           return y;
  //         });
  //         break;
  //       case 'map':
  //         this.results = {};
  //         responses.filter(x => !x.error).map(x => {
  //           let y: any = null;
  //           if (x.error) {
  //             y = new Error(x.error.message);
  //           } else {
  //             y = this.factory.handleResponse(x, err);
  //           }
  //           this.results[[x.nodeId, x.instNr].join(':')] = y;
  //         });
  //         break;
  //       case 'raw':
  //         this.results = responses;
  //         break;
  //       default:
  //         this.results = responses.map(x => {
  //           let y: any = null;
  //           if (x.error) {
  //             y = new Error(x.error.message);
  //           } else {
  //             y = this.factory.handleResponse(x, err);
  //           }
  //           return y;
  //         });
  //     }
  //     this.emit('finished', err, this.results);
  //   } catch (e) {
  //     this.emit('finished', err || e, this.results);
  //   }
  //
  // }
  doPostProcess(responses: RES[], err?: Error): any {
    let results: any = null;
    switch (this.options.outputMode) {
      case 'embed_nodeId':
        results = responses.map(x => {
          let y: any = null;
          if (x.error) {
            y = new Error(x.error.message);
          } else {
            y = this.factory.handleResponse(x, err);
          }
          y['__nodeId__'] = x.nodeId;
          y['__instNr__'] = x.instNr;
          return y;
        });
        break;
      case 'map':
        results = {};
        responses.filter(x => !x.error).map(x => {
          let y: any = null;
          if (x.error) {
            y = new Error(x.error.message);
          } else {
            y = this.factory.handleResponse(x, err);
          }
          results[[x.nodeId, x.instNr].join(':')] = y;
        });
        break;
      case 'responses':
        results = responses;
        break;
      case 'only_value':
      default:
        results = responses.map(x => {
          let y: any = null;
          if (x.error) {
            y = new Error(x.error.message);
          } else {
            y = this.factory.handleResponse(x, err);
          }
          return y;
        });
    }
    return results;
  }


}
