import {IStorageOptions} from './IStorageOptions';
import {assign, has, isArray, isEmpty, isFunction, isObjectLike, isString, keys, values} from 'lodash';
import {K_DEFAULT_FRAMEWORK, C_ENTITY, K_CLS_STORAGE_TYPES} from '../Constants';
import {ClassType, IClassRef} from '@allgemein/schema-api';
import {IStorage} from './IStorage';
import {IStorageRef} from './IStorageRef';
import {Log} from '../../libs/logging/Log';
import {IRuntimeLoader} from '../core/IRuntimeLoader';
import {StringUtils} from '../utils/StringUtils';
import {FileUtils, NotSupportedError, NotYetImplementedError, PlatformUtils} from '@allgemein/base';
import {REGISTRY_TYPEORM} from './framework/typeorm/Constants';


export class Storage {

  static NAME = 'Storage';

  nodeId: string;

  storageFramework: { [key: string]: IStorage } = {};

  defaultFramework = REGISTRY_TYPEORM;

  private storageRefs: { [key: string]: IStorageRef } = {};


  /**
   * return the name of the default framework to use
   */
  getDefaultFramework() {
    return this.defaultFramework;
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

    if (config[K_DEFAULT_FRAMEWORK]) {
      this.defaultFramework = (config as any)[K_DEFAULT_FRAMEWORK];
    }

    // keys starting with undercore or dollar are reserved for generic configuration
    const storageNames = keys(config).filter(x => !/^(_|\$)/.test(x));

    // const storageRefs = [];
    // iterate over storage configurations
    for (const name of storageNames) {
      const settings: IStorageOptions = config[name];

      let entities: Function[] = [];
      if (loader) {
        // load entities handled by storage
        entities = loader.getClasses([C_ENTITY, name].join('.'));
        // check if classes are realy for typeorm
        if (has(settings, 'extends')) {
          // if extends property is set
          let _extends = [];
          if (isString(settings.extends)) {
            _extends.push(settings.extends);
          } else {
            _extends = settings.extends;
          }
          _extends.forEach((x: string) => {
            const classEntitiesAdditional = loader
              .getClasses([C_ENTITY, x].join('.'));
            if (classEntitiesAdditional.length > 0) {
              entities.push(...classEntitiesAdditional);
            }
          });
        }

        // const x = loader.getRegistry().createSettingsLoader({
        //   ref: ''
        // });

      }

      const replace = {};
      const declaredEntities = settings.entities || [];
      for (let i = 0; i < declaredEntities.length; i++) {
        // check if is file path
        // check if is http
        // check if is glob -> remove -> add matched files
        // if function add
        let entry = declaredEntities[i];

        if (isString(entry)) {
          let object = null;
          if (/^\s*{/.test(entry) && /}\s*$/.test(entry)) {
            try {
              object = JSON.parse(entry);
            } catch (e) {
              Log.error(e);
            }
          } else {
            const type = StringUtils.checkIfPathLocation(entry);
            switch (type) {
              case 'url':
              case 'unknown':
                throw new NotYetImplementedError('TODO');
              case 'glob':
                try {
                  const appdir = loader.getOptions().appdir;
                  if (!PlatformUtils.isAbsolute(entry)) {
                    entry = PlatformUtils.join(appdir, entry);
                  }
                  const paths = await FileUtils.glob(entry);
                  const entries = [];
                  for (const path of paths) {
                    object = await this.fromPath(path);
                    if (isArray(object)) {
                      entries.push(...object);
                    } else {
                      entries.push(object);
                    }
                  }
                  object = entries;
                } catch (e) {
                  Log.error(e);
                }
                break;
              case 'relative':
              case 'absolute':
                const path = type === 'relative' ? PlatformUtils.pathResolveAndNormalize(entry) : entry;
                object = await this.fromPath(path);
                break;
            }
          }
          if (object) {
            replace[entry] = object;
          }
        } else if (isFunction(entry)) {
          entities.push(entry);
        }
      }


      keys(replace).map(k => {
        const index = declaredEntities.findIndex(v => v === k);
        declaredEntities.splice(index, 1);
        if (isArray(replace[k])) {
          entities.push(...replace[k]);
        } else {
          entities.push(replace[k]);
        }
      });

      const _settings: IStorageOptions = assign(settings, {entities: entities}, {name: name});
      Log.debug('storage register ' + name + ' with ' + entities.length + ' entities');
      const storageRef = await this.register(name, _settings);

      // if initialize method is present then run it
      if (storageRef.initialize) {
        await storageRef.initialize();
      }

      if (storageRef.getOptions().connectOnStartup) {
        await storageRef.prepare();
      }
    }

    for (const ref of this.getRefs()) {
      let _extended = [];
      const extended = ref.getOptions().extends;
      if (isString(extended)) {
        _extended.push(extended);
      } else {
        _extended = extended;
      }

      if (!isEmpty(_extended)) {
        for (const ext of _extended) {
          const extRef = this.get(ext);
          extRef.addExtendedStorageRef(ref);
          ref.addExtendingStorageRef(extRef);
        }
      }
    }
  }

  async fromPath(path: string) {
    let object = null;
    try {
      if (/\.json$/.test(path)) {
        // json
        const content = (await PlatformUtils.readFile(path)).toString('utf-8');
        object = JSON.parse(content);
        Object.defineProperty(object, '__SOURCE__', {value: path});
      } else if (/\.(t|j)s$/.test(path)) {
        // require
        const mod = require(path.replace(/\.(t|j)s$/, ''));
        object = [];
        keys(mod).map(x => {
          const value = mod[x];
          Object.defineProperty(value, '__SOURCE__', {value: path});
          if (isFunction(value)) {
            object.push(value);
          } else if (isObjectLike(value)) {
            object.push(value);
          }
        });
      } else {
        throw new NotSupportedError('path or content not supported');
      }
    } catch (e) {
      Log.error(e);
    }
    return object;

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
    return values(this.storageRefs);
  }


  getNames() {
    return keys(this.storageRefs);
  }


  getAllOptions() {
    return values(this.storageRefs).map(ref => ref.getOptions());
  }

  async shutdown() {
    const ps = values(this.storageRefs).map(async x => {
      try {
        await x.shutdown();
      } catch (e) {
        Log.error(e);
      }
    });
    const res = await Promise.all(ps);

    for (const f of values(this.storageFramework)) {
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


