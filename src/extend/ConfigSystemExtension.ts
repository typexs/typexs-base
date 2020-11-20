import * as _ from 'lodash';
import {ISystemApi} from '../api/ISystemApi';
import {UseAPI} from '../decorators/UseAPI';
import {SystemApi} from '../api/System.api';
import {INodeInfo} from '../libs/system/INodeInfo';
import {Inject} from 'typedi';
import {SystemNodeInfo} from '../entities/SystemNodeInfo';
import {ConfigUtils} from '../libs/utils/ConfigUtils';
import {C_CONFIG, C_KEY_SEPARATOR} from '../libs/Constants';
import {Cache} from '../libs/cache/Cache';
import {System} from '../libs/system/System';

@UseAPI(SystemApi)
export class ConfigSystemExtension implements ISystemApi {


  @Inject(System.NAME)
  system: System;


  @Inject(Cache.NAME)
  cache: Cache;


  getNodeInfos() {
    const data = ConfigUtils.clone();
    const nodeTaskContext: INodeInfo = {
      context: C_CONFIG,
      config: data
    };
    return nodeTaskContext;
  }


  async onNodeRegister(x: SystemNodeInfo) {
    if (x && _.has(x, 'contexts')) {
      const found = _.find(x.contexts, x => x.context === C_CONFIG);
      if (found) {
        let c = _.get(found, 'config', {});
        if (_.isArray(c)) {
          c = c.shift();
        }
        await this.cache.set([C_CONFIG, x.nodeId].join(C_KEY_SEPARATOR), c);
      }
    }
  }


  async onNodeUnregister(x: SystemNodeInfo) {
    const nodes = this.system.getAllNodes().filter(x => x.nodeId === this.system.node.nodeId);
    if (nodes.length > 0) {
      // remove if no node exists
      await this.cache.set([C_CONFIG, x.nodeId].join(C_KEY_SEPARATOR), null);
    }
  }

}
