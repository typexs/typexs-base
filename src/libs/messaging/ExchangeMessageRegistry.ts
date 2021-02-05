import {IEntityRef, ILookupRegistry, IPropertyRef, LookupRegistry, XS_TYPE} from 'commons-schema-api/browser';
import {C_EXCHANGE_MESSAGE} from './Constants';
import {NotYetImplementedError} from '@allgemein/base';
import {ClassUtils} from '@allgemein/base';
import {XS_TYPE_ENTITY} from 'commons-schema-api';
import {WorkerRef} from '../worker/WorkerRef';
import * as _ from 'lodash';
import {MatchUtils} from '../utils/MatchUtils';
import {IExchangeMessageConfig} from './IExchangeMessageConfig';
import {ExchangeMessageRef} from './ExchangeMessageRef';

const DEFAULT_OPTIONS: IExchangeMessageConfig = {access: []};


export class ExchangeMessageRegistry implements ILookupRegistry {

  static NAME = ExchangeMessageRegistry.name;

  registry: LookupRegistry = LookupRegistry.$(C_EXCHANGE_MESSAGE);

  config: IExchangeMessageConfig = DEFAULT_OPTIONS;

  setConfig(config: IExchangeMessageConfig = DEFAULT_OPTIONS) {
    this.config = config;
  }


  add(fn: Function) {
    const name = ClassUtils.getClassName(fn);
    if (this.access(name)) {
      let exists = this.registry.find(XS_TYPE_ENTITY, (d: WorkerRef) => d.name === name);
      if (!exists) {
        exists = new ExchangeMessageRef(fn);
        this.registry.add(XS_TYPE_ENTITY, exists);
      }
      return exists;
    }
    return null;
  }


  access(name: string) {
    if (_.has(this.config, 'access')) {
      // if access empty then
      let allow = this.config.access.length > 0 ? false : true;
      let count = 0;
      for (const a of this.config.access) {
        if (_.isUndefined(a.match)) {
          if (/\+|\.|\(|\\||\)|\*/.test(a.name)) {
            a.match = a.name;
          } else {
            a.match = false;
          }
        }
        if (_.isBoolean(a.match)) {
          if (a.name === name) {
            count++;
            allow = a.access === 'allow';
            return allow;
          }
        } else {
          if (MatchUtils.miniMatch(a.match, name)) {
            allow = allow || a.access === 'allow';
            count++;
          }
        }
      }
      // no allowed or denied
      if (count === 0) {
        allow = true;
      }
      return allow;
    }
    return true;
  }


  findForRequest(x: any) {
    for (const e of this.registry.list(XS_TYPE_ENTITY) as ExchangeMessageRef[]) {
      const exchange = e.getExchange();
      if (exchange && exchange.isActive() && x instanceof e.getExchange().getReqClass()) {
        return e;
      }
    }
    return null;
  }


  getEntries(): ExchangeMessageRef[] {
    return this.registry.list(XS_TYPE_ENTITY);
  }


  fromJson(json: any): IEntityRef {
    throw new NotYetImplementedError();
  }

  getEntityRefFor(fn: any): IEntityRef {
    throw new NotYetImplementedError();
  }

  getPropertyRefsFor(fn: any): IPropertyRef[] {
    throw new NotYetImplementedError();
  }

  list<X>(type: XS_TYPE, filter?: (x: any) => boolean): X[] {
    return this.registry.filter(type, filter);
  }

  listEntities(filter?: (x: IEntityRef) => boolean): IEntityRef[] {
    return this.registry.filter(XS_TYPE_ENTITY, filter);
  }

  listProperties(filter?: (x: IPropertyRef) => boolean): IPropertyRef[] {
    throw new NotYetImplementedError();
  }

}
