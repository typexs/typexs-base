import {IEntityRef, METATYPE_ENTITY} from '@allgemein/schema-api';
import {K_CLS_WORKERS} from './Constants';
import {ClassUtils} from '@allgemein/base';
import {IWorkerRefOptions, WorkerRef} from './WorkerRef';
import {IWorkerConfig} from './IWorkerConfig';
import * as _ from 'lodash';
import {IWorker} from './IWorker';
import {IWorkerInfo} from './IWorkerInfo';
import {MatchUtils} from '../utils/MatchUtils';
import {RuntimeLoader} from '../../base/RuntimeLoader';
import {Injector} from '../di/Injector';
import {Log} from '../logging/Log';
import {AbstractRegistry} from '@allgemein/schema-api/lib/registry/AbstractRegistry';


const DEFAULT_OPTIONS: IWorkerConfig = {access: [{access: 'deny', name: '*'}]};


export class Workers extends AbstractRegistry {

  static NAME = 'Workers';

  config: IWorkerConfig = DEFAULT_OPTIONS;

  workers: IWorker[] = [];


  /**
   * Execute on bootstrap startup. Get all worker classes from runtime enviroment
   * an register them.
   *
   * @param loader
   */
  onStartup(loader?: RuntimeLoader) {
    const klasses = loader.getClasses(K_CLS_WORKERS);
    for (const klass of klasses) {
      this.addWorkerClass(klass);
    }
  }


  setConfig(config: IWorkerConfig = DEFAULT_OPTIONS) {
    this.config = config;
    // deny all, it must be explizit allowed!
    if (this.config.access.length === 0 || (this.config.access[0].name !== '*' && this.config.access[0].access !== 'deny')) {
      this.config.access.unshift({access: 'deny', name: '*'});
    }
  }

  contains(name: string) {
    return !!this.get(name);
  }

  get(name: string) {
    const snakeCase = _.snakeCase(name);
    return this.find(METATYPE_ENTITY, (w: WorkerRef) => w.name === name || _.snakeCase(w.name) === snakeCase);
  }


  async startup() {
    const refs: WorkerRef[] = this.list(METATYPE_ENTITY);
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
    return _.map(this.getEntities(), (x: IWorker) => {
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


  addWorkerClass(fn: Function): WorkerRef {
    const name = ClassUtils.getClassName(fn);
    if (this.access(name)) {
      let exists = this.find(METATYPE_ENTITY, (d: WorkerRef) => d.getClassRef().getClass() === fn) as WorkerRef;
      if (!exists) {
        exists = this.create(METATYPE_ENTITY, <IWorkerRefOptions>{
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
      const entry = new WorkerRef(options);
      this.add(METATYPE_ENTITY, entry);
      return entry as any;
    }
    return null;
  }

  getEntities(filter?: (x: IEntityRef) => boolean): IEntityRef[] {
    return this.filter(METATYPE_ENTITY, filter);
  }


}
