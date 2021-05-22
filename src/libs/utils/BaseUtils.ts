import * as _ from 'lodash';
import {Utils} from '@allgemein/config';
import {InterpolationSupport} from '@allgemein/config/supports/InterpolationSupport';
import {TreeUtils} from '@allgemein/base';
import {ClassUtils} from '@allgemein/base';
import {WalkValues} from '@allgemein/base/utils/TreeUtils';


export class BaseUtils {


  static resolveByClassName<T>(objs: T[]) {
    const resolved: { [entityType: string]: T[] } = {};
    for (const obj of objs) {
      const entityName = ClassUtils.getClassName(obj as any);
      if (!resolved[entityName]) {
        resolved[entityName] = [];
      }
      resolved[entityName].push(obj);

    }
    return resolved;
  }


  static wait(time: number): Promise<any> {
    return new Promise(resolve => {
      setTimeout(function () {
        resolve(null);
      }, time);
    });
  }

  static interpolate(msg: string, parameter: { [k: string]: string }): string {
    const data = {msg: msg};
    try {
      InterpolationSupport.exec(data, parameter);
    } catch (e) {
      throw e;
    }
    return data.msg;
  }

  static flattenDate(d: Date) {
    // reset milliseconds for datefields
    const rest = d.getTime() % 1000;
    return new Date(d.getTime() - rest);
  }

  static now() {
    const now = new Date();
    // reset milliseconds for datefields
    const rest = now.getTime() % 1000;
    return new Date(now.getTime() - rest);
  }

  /**
   * https://stackoverflow.com/questions/1960473/unique-values-in-an-array
   * @param arr
   * @returns {any[]}
   */
  static unique_array(arr: any[]): any[] {
    return _.uniq(arr);
    // return arr.filter((v, i, a) => a.indexOf(v) === i);
  }

  static escapeRegExp(text: string): string {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  }

  static clone(obj: any) {
    return _.clone(obj);
  }


  static uniqArr(res: any[]) {
    return Utils.uniqArr(res);
  }

  static merge(...args: any[]): any {
    return Utils.merge(...args);
  }


  static walk(root: any, fn: (v: WalkValues) => void) {
    return TreeUtils.walk(root, fn);
  }


  static get(arr: any, path: string = null): any {
    if (path) {
      const paths = path.split('.');
      let first: string | number = paths.shift();
      if (/^[1-9]+\d*$/.test(first)) {
        first = parseInt(first, 0);
      }
      if (arr.hasOwnProperty(first)) {
        const pointer: any = arr[first];
        if (paths.length === 0) {
          return pointer;
        } else {
          return BaseUtils.get(pointer, paths.join('.'));
        }
      } else {
        // not found
        return null;
      }

    }
    return arr;
  }

  static splitTyped(arr: string, sep: string = '.'): any[] {
    const paths = arr.split('.');
    const normPaths: any[] = [];
    paths.forEach(function (_x) {
      if (typeof _x === 'string' && /\d+/.test(_x)) {
        normPaths.push(parseInt(_x, 0));
      } else {
        normPaths.push(_x);
      }

    });
    return normPaths;
  }

  static set(arr: any, path: string | any[], value: any): boolean {
    let paths = null;
    let first: string | number = null;

    if (typeof path === 'string') {
      paths = BaseUtils.splitTyped(path);
    } else {
      paths = path;
    }
    first = paths.shift();
    const next = paths.length > 0 ? paths[0] : null;


    if (!arr.hasOwnProperty(first)) {
      // new, key doesn't exists
      if (typeof next === 'number') {
        // if next value is a number then this must be an array!
        arr[first] = [];
      } else {
        arr[first] = {};
      }
    } else {
      if (Array.isArray(arr)) {
        if (!(typeof first === 'number')) {
          return false;
        }
      } else if (Array.isArray(arr[first])) {
        if (!(typeof next === 'number')) {
          return false;
        }
      } else if (!BaseUtils.isObject(arr[first])) {
        // primative
        if (BaseUtils.isObject(value)) {
          return false;
        }
      } else {
        if (typeof next === 'number') {
          // must be array
          if (!Array.isArray(arr[first])) {
            return false;
          }
        }
      }
    }

    if (paths.length > 0) {
      return BaseUtils.set(arr[first], paths, value);
    } else {
      arr[first] = value;
      return true;
    }
  }


  static isObject(o: any) {
    return _.isPlainObject(o);
  }


}
