import {System} from '../system/System';
import {SystemInfoRequestEvent} from './SystemInfoRequestEvent';
import {EventEmitter} from 'events';

import * as _ from 'lodash';

import {EventBus, subscribe} from 'commons-eventbus';
import {NodeRuntimeInfo} from './NodeRuntimeInfo';
import {SystemInfoResponse} from './SystemInfoResponse';
import {K_NODE_ID} from '../messaging/Constants';

export class SystemInfoRequest extends EventEmitter {

  private system: System;

  private timeout = 5000;

  private event: SystemInfoRequestEvent;

  private responses: SystemInfoResponse[] = [];

  private targetIds: string[];

  private results: any[] = [];

  private active = true;

  constructor(system: System) {
    super();
    this.system = system;
    this.once('postprocess', this.postProcess.bind(this));
  }


  async run(nodeIds: string[] = []): Promise<NodeRuntimeInfo[]> {

    if (nodeIds.length === 0) {
      this.targetIds = this.system.nodes.map(n => n.nodeId);
    }

    this.event = new SystemInfoRequestEvent();
    this.event.instNr = this.system.node.instNr;
    this.event.nodeId = this.system.node.nodeId;
    this.event.targetIds = this.targetIds;
    await EventBus.register(this);
    const ready = this.ready();
    await EventBus.postAndForget(this.event);
    try {
      await ready;
    } catch (err) {
    }

    try {
      await EventBus.unregister(this);
    } catch (e) {
    }
    return this.results;
  }

  postProcess(err: Error) {
    this.results = this.responses.map(x => _.assign(new NodeRuntimeInfo(), x.info));
    this.emit('finished', err, this.results);
  }


  @subscribe(SystemInfoResponse)
  onResults(event: SystemInfoResponse) {
    if (!this.active) {
      return;
    }

    // has query event
    if (!this.event) {
      return;
    }

    // results for me?
    if (event.targetIds.indexOf(this.system.node.nodeId) === -1) {
      return;
    }

    // waiting for the results?
    if (this.targetIds.indexOf(event.nodeId) === -1) {
      return;
    }
    _.remove(this.targetIds, x => x === event.nodeId);

    event.info[K_NODE_ID] = event.nodeId;
    this.responses.push(event);

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
