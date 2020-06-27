import * as _ from 'lodash';

import {Container} from 'typedi';
import {IAPIDef} from '../libs/api/IAPIDef';
import {ClassType} from 'commons-schema-api/browser';
import {Injector} from '..';


export class Invoker {

  static NAME: string = 'Invoker';


  private apiImpls: IAPIDef[] = [];


  register(api: Function, impl: Function | Function[]) {
    let def = _.find(this.apiImpls, x => x.api === api);
    if (!def) {
      const invoker = this;
      const obj = {};
      const proto = Object.getOwnPropertyNames(api.prototype);
      proto.forEach(p => {
        if (p === 'constructor') { return; }
        const desc = Object.getOwnPropertyDescriptor(api.prototype, p);
        if (_.isFunction(desc.value)) {
          obj[p] = function (...args: any[]) {
            return invoker.execute(api, p, ...args);
          };
        }
      });
      def = {api: api, impl: [], handle: obj};
      this.apiImpls.push(def);
    }
    if (_.isArray(impl)) {
      impl.forEach(i => {
        if (def.impl.indexOf(i) === -1) {
          def.impl.push(i);
        }
      });
    } else {
      if (def.impl.indexOf(impl) === -1) {
        def.impl.push(impl);
      }
    }
  }

  private async execute(api: Function, method: string, ...args: any[]) {
    const def = _.find(this.apiImpls, apiImpl => apiImpl.api === api);
    const instances = def.impl.map(impl => Injector. get(impl));
    const results = [];
    // TODO maybe parallel
    for (const instance of instances) {
      let ret = null;
      if (instance[method]) {
        ret = await instance[method].apply(instance, args);
      }
      results.push(ret);
    }
    return results;
  }


  has(api: Function) {
    const c = _.find(this.apiImpls, apiImpl => apiImpl.api === api);
    return !!c;
  }


  hasImpl(api: Function) {
    const c = _.find(this.apiImpls, apiImpl => apiImpl.api === api);
    return !_.isEmpty(c.impl);
  }


  use<API>(api: ClassType<API>): API {
    const def = _.find(this.apiImpls, apiImpl => apiImpl.api === api);
    if (!def) {
      throw new Error('no api implementation found');
    }
    return <API>def.handle;
  }

}
