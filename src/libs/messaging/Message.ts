import * as _ from 'lodash';
import {AbstractEvent} from './AbstractEvent';
import {AbstractExchange} from './AbstractExchange';
import {IMessageOptions} from './IMessageOptions';
import {AbstractMessage} from './AbstractMessage';
import {K_INST_ID, K_NODE_ID} from './Constants';


export class Message<REQ extends AbstractEvent, RES extends AbstractEvent>
  extends AbstractMessage<REQ, RES> {

  private factory: AbstractExchange<REQ, RES>;

  constructor(factory: AbstractExchange<REQ, RES>, options: IMessageOptions = {}) {
    super(factory.getSystem(),
      factory.getReqClass(),
      factory.getResClass(), {...options, logger: factory.logger});
    this.factory = factory;
  }

  async beforeSend(req: REQ) {
    if (_.isUndefined(this.options.skipLocal) ||
      !_.get(this.options, 'skipLocal', false)) {
      if (!this.detectTargets && !_.isEmpty(this.targetIds) && !this.targetIds.includes(this.getLocalNodeId())) {
        // concrete targets are given, were the local node aren't part of it
        return;
      }
      const localResponse = await this.factory.getResponse(req);
      this.responses.push(localResponse);
      // self already done remove from target list
      _.remove(this.targetIds, x => x === this.getLocalNodeId());
    }
  }

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
          y[K_NODE_ID] = x.nodeId;
          y[K_INST_ID] = x.instNr;
          return y;
        });
        break;
      case 'map':
        results = {};
        responses.filter(x => !x.error).map(x => {
          let y: any = null;
          if (x.error) {
            y = new Error(x.error.message);
            y[K_NODE_ID] = x.nodeId;
            y[K_INST_ID] = x.instNr;
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
            y[K_NODE_ID] = x.nodeId;
            y[K_INST_ID] = x.instNr;
          } else {
            y = this.factory.handleResponse(x, err);
          }
          return y;
        });
    }
    return results;
  }


}
