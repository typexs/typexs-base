import * as _ from 'lodash';
import {Config} from 'commons-config';
import {ClassLoader, TreeUtils, WalkValues} from 'commons-base';
import {AbstractExchange} from '../../../libs/messaging/AbstractExchange';
import {ConfigRequest} from './ConfigRequest';
import {ConfigResponse} from './ConfigResponse';
import {IMessageOptions} from '../../../libs/messaging/Message';

const filterKeys = [
  'password',
  'pass',
  'credential',
  'credentials',
  'secret',
  'token'
];


export class ConfigExchange extends AbstractExchange<ConfigRequest, ConfigResponse> {

  constructor() {
    super(ConfigRequest, ConfigResponse);
  }


  async key(key: string, opts: IMessageOptions = {}) {
    const r = new ConfigRequest();
    r.key = key;
    const msg = this.create(opts);
    return await msg.run(r);
  }


  handleRequest(request: ConfigRequest, res: ConfigResponse) {
    let _orgCfg: any = {};
    if (!_.isEmpty(request) && !_.isEmpty(request.key)) {
      _orgCfg = Config.get(request.key);
    } else {
      _orgCfg = Config.get();
    }

    const cfg = _.cloneDeepWith(_orgCfg);
    const _filteredKeys = _.concat(filterKeys, Config.get('config.hide.keys', []));

    TreeUtils.walk(cfg, (x: WalkValues) => {
      // TODO make this list configurable! system.info.hide.keys!
      if (_.isString(x.key) && _filteredKeys.indexOf(x.key) !== -1) {
        delete x.parent[x.key];
      }
      if (_.isFunction(x.value)) {
        if (_.isArray(x.parent)) {
          x.parent[x.index] = ClassLoader.getClassName(x.value);
        } else {
          x.parent[x.key] = ClassLoader.getClassName(x.value);
        }
      }
    });
    res.value = cfg;
  }


  handleResponse(responses: ConfigResponse): any {
    return responses.value;
  }
}


