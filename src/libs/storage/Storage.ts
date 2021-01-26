import {IStorageOptions, K_STORAGE} from './IStorageOptions';
import * as _ from 'lodash';
import {K_CLS_STORAGE_TYPES} from '../Constants';
import {IClassRef} from 'commons-schema-api/browser';
import {IStorage} from './IStorage';
import {Config} from '@allgemein/config/browser';
import {IStorageRef} from './IStorageRef';
import {Log} from '../../libs/logging/Log';
import {IRuntimeLoader} from '../core/IRuntimeLoader';
import {ClassType} from 'commons-schema-api/browser';


export class Storage {

  static NAME = 'Storage';

  nodeId: string;

  storageFramework: { [key: string]: IStorage } = {};

  private storageRefs: { [key: string]: IStorageRef } = {};


  /**
   * return the name of the default framework to use
   */
  getDefaultFramework() {
    return Config.get(K_STORAGE + '._defaultFramework', 'typeorm');
  }


  async register(name: string, options: IStorageOptions): Promise<IStorageRef> {
    const useFramework = options.framework || this.getDefaultFramework();
    if (this.storageFramework[useFramework]) {
      const ref = await this.storageFramework[useFramework].create(name, options);
      this.storageRefs[name] = ref;
      return ref;
    } else {
      throw new Error('not framework with ' + useFramework + ' exists');
    }
  }

  async registerFramework<T extends IStorage>(cls: ClassType<T> | Function, loader?: IRuntimeLoader): Promise<T> {
    const obj = <IStorage>Reflect.construct(cls, []);
    if (obj && await obj.prepare(loader)) {
      this.storageFramework[obj.getType()] = obj;
    }
    return obj as any;

  }


  async prepare(config: { [name: string]: IStorageOptions }, loader?: IRuntimeLoader) {
    if (loader) {
      const classes = await loader.getClasses(K_CLS_STORAGE_TYPES);
      for (const cls of classes) {
        await this.registerFramework(cls, loader);
      }
    }

    // keys starting with undercore or dollar are reserved for generic configuration
    const storageNames = _.keys(config).filter(x => !/^(_|\$)/.test(x));

    // const storageRefs = [];
    // iterate over storage configurations
    for (const name of storageNames) {
      const settings: any = config[name];
      let entities: Function[] = [];
      if (loader) {
        // load entities handled by storage
        entities = loader.getClasses(['entity', name].join('.'));
        // check if classes are realy for typeorm
        if (_.has(settings, 'extends')) {
          // if extends property is set
          let _extends = [];
          if (_.isString(settings.extends)) {
            _extends.push(settings.extends);
          } else {
            _extends = settings.extends;
          }
          _extends.forEach((x: string) => {
            const __entities = loader.getClasses(['entity', x].join('.'));
            if (__entities.length > 0) {
              entities.push(...__entities);
            }
          });
        }
      }

      const _settings: IStorageOptions = _.merge(settings, {entities: entities}, {name: name});
      Log.debug('storage register ' + name + ' with ' + entities.length + ' entities');
      const storageRef = await this.register(name, _settings);
      if (storageRef.getOptions().connectOnStartup) {
        await storageRef.prepare();
      }

    }

    for (const ref of this.getRefs()) {
      let _extended = [];
      const extended = ref.getOptions().extends;
      if (_.isString(extended)) {
        _extended.push(extended);
      } else {
        _extended = extended;
      }

      if (!_.isEmpty(_extended)) {
        for (const ext of _extended) {
          const extRef = this.get(ext);
          extRef.addExtendedStorageRef(ref);
          ref.addExtendingStorageRef(extRef);
        }
      }
    }


  }


  /**
   * Returns storage ref for the given classRef or machineName
   * @param classRef
   */
  forClass<X extends IStorageRef>(classRef: string | Function | IClassRef): X {
    for (const k in this.storageRefs) {
      if (this.storageRefs[k].hasEntityClass(classRef)) {
        return this.storageRefs[k] as X;
      }
    }
    return null;
  }


  get<X extends IStorageRef>(name: string = 'default'): X {
    return this.storageRefs[name] as X;
  }

  getRefs(): IStorageRef[] {
    return _.values(this.storageRefs);
  }


  getNames() {
    return _.keys(this.storageRefs);
  }


  getAllOptions() {
    return _.values(this.storageRefs).map(ref => ref.getOptions());
  }

  async shutdown() {
    const ps = _.values(this.storageRefs).map(async x => {
      try {
        await x.shutdown();
      } catch (e) {
        Log.error(e);
      }
    });
    const res = await Promise.all(ps);

    for (const f of _.values(this.storageFramework)) {
      try {
        if (f.shutdown) {
          await f.shutdown();
        }

      } catch (e) {
        Log.error(e);
      }

    }
    return res;
  }

}


