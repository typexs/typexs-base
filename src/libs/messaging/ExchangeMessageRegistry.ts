import {IEntityRef, METATYPE_ENTITY} from '@allgemein/schema-api';
import {ClassUtils} from '@allgemein/base';
import {WorkerRef} from '../worker/WorkerRef';
import * as _ from 'lodash';
import {MatchUtils} from '../utils/MatchUtils';
import {IExchangeMessageConfig} from './IExchangeMessageConfig';
import {ExchangeMessageRef, IExchangeMessageRefOptions} from './ExchangeMessageRef';
import {AbstractRegistry} from '@allgemein/schema-api/lib/registry/AbstractRegistry';

const DEFAULT_OPTIONS: IExchangeMessageConfig = {access: []};


export class ExchangeMessageRegistry extends AbstractRegistry {

  static NAME = ExchangeMessageRegistry.name;

  config: IExchangeMessageConfig = DEFAULT_OPTIONS;


  setConfig(config: IExchangeMessageConfig = DEFAULT_OPTIONS) {
    this.config = config;
  }


  addExchangeMessage(fn: Function) {
    const name = ClassUtils.getClassName(fn);
    if (this.access(name)) {
      let exists = this.find(METATYPE_ENTITY, (d: WorkerRef) => d.name === name);
      if (!exists) {

        exists = this.create(METATYPE_ENTITY, <IExchangeMessageRefOptions>{
          metaType: METATYPE_ENTITY,
          namespace: this.namespace,
          target: fn,
        });

      }
      return exists;
    }
    return null;
  }

  create<T>(context: string, options: any): T {
    if (context === METATYPE_ENTITY) {
      const entry = new ExchangeMessageRef(options);
      this.add(METATYPE_ENTITY, entry);
      return entry as any;
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
    for (const e of this.getEntities() as ExchangeMessageRef[]) {
      const exchange = e.getExchange();
      if (exchange && exchange.isActive() && x instanceof e.getExchange().getReqClass()) {
        return e;
      }
    }
    return null;
  }


  // getEntries(): ExchangeMessageRef[] {
  //   return this.list(METATYPE_ENTITY);
  // }

  getEntities(filter?: (x: ExchangeMessageRef) => boolean): ExchangeMessageRef[] {
    return this.filter(METATYPE_ENTITY, filter);
  }

  //
  //
  // fromJson(json: any): IEntityRef {
  //   throw new NotYetImplementedError();
  // }


}
