import {ILookupRegistry, IPropertyRef, LookupRegistry, XS_TYPE_ENTITY} from 'commons-schema-api';
import {C_WORKERS, K_CLS_WORKERS} from './Constants';
import {ClassUtils, NotYetImplementedError} from 'commons-base';
import {WorkerRef} from './WorkerRef';
import {IWorkerConfig} from './IWorkerConfig';
import * as _ from 'lodash';
import {IWorker} from './IWorker';
import {IWorkerInfo} from './IWorkerInfo';
import {MatchUtils} from '../utils/MatchUtils';
import {RuntimeLoader} from '../../base/RuntimeLoader';
import {Injector, Log} from "../..";


const DEFAULT_OPTIONS: IWorkerConfig = {access: [{access: 'deny', name: '*'}]};


export class Workers implements ILookupRegistry {

  static NAME = 'Workers';

  registry: LookupRegistry = LookupRegistry.$(C_WORKERS);

  config: IWorkerConfig = DEFAULT_OPTIONS;

  workers: IWorker[] = [];


  prepare(loader: RuntimeLoader) {
    const klasses = loader.getClasses(K_CLS_WORKERS);
    for (const klass of klasses) {
      this.add(klass);
    }
  }


  setConfig(config: IWorkerConfig = DEFAULT_OPTIONS) {
    this.config = config;
    // deny all, it must be explizit allowed!
    if (this.config.access.length === 0 || (this.config.access[0].name !== '*' && this.config.access[0].access !== 'deny')) {
      this.config.access.unshift({access: 'deny', name: '*'});
    }
  }


  async startup() {
    const refs: WorkerRef[] = this.registry.list(XS_TYPE_ENTITY);
    for (const ref of refs) {
      Log.debug('worker name ' + ref.name);
      try {
        const workerInstance = <IWorker>Injector.get(ref.getClass());
        const config = _.get(this.config, 'config.' + ref.name, _.get(this.config, 'config.' + workerInstance.name, null));
        if (config) {
          await workerInstance.prepare(config);
        } else {
          await workerInstance.prepare();
        }
        this.workers.push(workerInstance);
      } catch (e) {
        Log.error(e);
      }
    }
  }


  metadata() {
    return _.map(this.getEntries(), (x: IWorker) => {
      return <IWorkerInfo>{
        name: x.name,
      };
    });
  }


  infos(): IWorkerInfo[] {
    return _.map(this.workers, (x: IWorker) => {
      return <IWorkerInfo>{
        name: x.name,
        className: x.constructor.name,
        statistics: x.statistic ? x.statistic() : null
      };
    });
  }


  activeWorkerCount() {
    return this.workers.length;
  }


  async shutdown() {
    for (const w of this.workers) {
      await w.finish();
    }
    this.reset();
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


  add(fn: Function) {
    const name = ClassUtils.getClassName(fn);
    if (this.access(name)) {
      let exists = this.registry.find(XS_TYPE_ENTITY, (d: WorkerRef) => d.name === name);
      if (!exists) {
        exists = new WorkerRef(fn);
        this.registry.add(XS_TYPE_ENTITY, exists);
      }
      return exists;
    }
    return null;
  }


  reset() {
    LookupRegistry.reset(C_WORKERS);
    this.registry = LookupRegistry.$(C_WORKERS);
  }

  fromJson(json: any): WorkerRef {
    throw new NotYetImplementedError();
  }


  private getEntries() {
    return this.registry.list(XS_TYPE_ENTITY);
  }


  getEntityRefFor(fn: any): WorkerRef {
    throw new NotYetImplementedError();
  }

  getPropertyRefsFor(fn: any): IPropertyRef[] {
    throw new NotYetImplementedError();
  }
}
