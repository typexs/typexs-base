import {IStorageOptions, K_STORAGE} from './IStorageOptions';
import * as _ from 'lodash';
import {RuntimeLoader} from '../../base/RuntimeLoader';
import {K_CLS_STORAGE_TYPES} from '../Constants';
import {IClassRef} from 'commons-schema-api';
import {IStorage} from './IStorage';
import {Config} from 'commons-config';
import {IStorageRef} from './IStorageRef';
import {Log} from '../..';


export class Storage {

  static NAME = 'Storage';

  nodeId: string;

  storageFramework: { [key: string]: IStorage } = {};

  private refs: { [key: string]: IStorageRef } = {};


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
      this.refs[name] = ref;
      return ref;
    } else {
      throw new Error('not framework with ' + useFramework + ' exists');
    }
  }


  async prepare(loader: RuntimeLoader) {
    const classes = await loader.getClasses(K_CLS_STORAGE_TYPES);
    for (const cls of classes) {
      const obj = <IStorage>Reflect.construct(cls, []);
      if (obj && await obj.prepare(loader)) {
        this.storageFramework[obj.getType()] = obj;
      }
    }
  }


  /**
   * Returns storage ref for the given classRef or machineName
   * @param classRef
   */
  forClass<X extends IStorageRef>(classRef: IClassRef | string): X {
    for (const k in this.refs) {
      if (this.refs[k].hasEntityClass(classRef)) {
        return this.refs[k] as X;
      }
    }
    return null;
  }


  get<X extends IStorageRef>(name: string = 'default'): X {
    return this.refs[name] as X;
  }


  getNames() {
    return _.keys(this.refs);
  }


  getAllOptions() {
    return _.values(this.refs).map(ref => ref.getOptions());
  }

  async shutdown() {
    const ps = _.values(this.refs).map(async x => {
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


