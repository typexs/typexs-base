import {EventEmitter} from 'events';
import {EventBus, subscribe} from 'commons-eventbus';
import * as _ from 'lodash';
import {AbstractEvent} from './AbstractEvent';
import EventBusMeta from 'commons-eventbus/bus/EventBusMeta';
import {AbstractExchange} from './AbstractExchange';
import {IMessageOptions} from './IMessageOptions';


export class Message<REQ extends AbstractEvent, RES extends AbstractEvent> extends EventEmitter {

  private timeout = 5000;

  private req: REQ;

  private responses: RES[] = [];

  private nodeIds: string[] = [];

  private targetIds: string[];

  private results: any[] = [];

  private active = true;

  private factory: AbstractExchange<REQ, RES>;

  private options: IMessageOptions = {};

  constructor(factory: AbstractExchange<REQ, RES>, options: IMessageOptions = {}) {
    super();
    this.options = options;
    this.factory = factory;
    if (options.nodeIds && _.isArray(options.nodeIds)) {
      options.nodeIds.forEach(x => {
        this.target(x);
      });
    }

    this.once('postprocess', this.postProcess.bind(this));
  }


  target(nodeId: string) {
    this.nodeIds.push(nodeId);
    return this;
  }


  async run(req: REQ): Promise<RES[]> {
    if (this.nodeIds.length === 0) {
      this.targetIds = this.factory.getSystem().nodes.map(n => n.nodeId);
    }

    if (_.isUndefined(this.options.skipLocal) ||
      !_.get(this.options, 'skipLocal', false)) {
      const localResponse = await this.factory.getResponse(req);
      this.responses.push(localResponse);
    }

    this.req = req || Reflect.construct(this.factory.getReqClass(), []);
    this.req.nodeId = this.factory.getSystem().node.nodeId;
    this.req.targetIds = _.uniq(this.targetIds);

    subscribe(this.factory.getResClass())(this, 'onResults');

    await EventBus.register(this);
    await EventBus.postAndForget(this.req);
    await this.ready();
    try {
      await EventBus.unregister(this);
    } catch (e) {
    }
    return this.results;
  }


  postProcess(err: Error) {
    let responses: RES[] = this.responses;
    if (this.options.filterErrors) {
      responses = this.responses.filter(x => !x.error);
    }

    switch (this.options.mode) {
      case 'embed_nodeId':
        this.results = responses.map(x => {
          const y = this.factory.handleResponse(x, err);
          y['__nodeId__'] = x.nodeId;
          y['__instNr__'] = x.instNr;
          return y;
        });
        break;
      case 'map':
        responses.filter(x => !x.error).map(x => {
          const y = this.factory.handleResponse(x, err);
          this.results[[x.nodeId, x.instNr].join(':')] = y;
        });
        break;
      case 'raw':
        this.results = responses.filter(x => !x.error);
        break;
      default:
        this.results = responses.map(x => this.factory.handleResponse(x, err));
    }

    this.emit('finished', err, this.results);
  }


  onResults(res: RES) {
    if (!this.active) {
      return;
    }

    // has query req
    if (!this.req || res.reqEventId !== this.req.id) {
      return;
    }

    // results for me?
    if (res.targetIds.indexOf(this.factory.getSystem().node.nodeId) === -1) {
      return;
    }

    // waiting for the results?
    if (this.targetIds.indexOf(res.nodeId) === -1) {
      return;
    }
    _.remove(this.targetIds, x => x === res.nodeId);

    res['__nodeId__'] = res.nodeId;
    this.responses.push(res);

    if (this.targetIds.length === 0) {
      this.active = false;
      this.emit('postprocess');
    }
  }


  ready() {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.emit('postprocess', new Error('timeout error'));
        clearTimeout(t);
      }, this.timeout);

      this.once('finished', (err: Error, data: any) => {
        // as long eventbus has no unregister
        const ns = EventBusMeta.toNamespace(this.factory.getResClass());
        _.remove(EventBusMeta.$()['$types'], x => x['namespace'] === ns);
        clearTimeout(t);
        if (err) {
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
