import * as _ from 'lodash';

export interface WalkValues {
  value: any,
  key: string | number,
  index: number,
  location: any
  parent: any
  isLeaf: boolean
}

export class TreeUtils {


  // todo move this to commons-base
  static walk(root: any, fn: (x: WalkValues) => void) {
    function walk(obj: any, parent: any = null, key: string | number = null, location: any[] = []) {
      if (obj === null || obj === undefined) return;
      if (_.isArray(obj)) {
        obj.forEach((el: any, j: number) => {
          let isLeaf = !_.isArray(el) && !_.isPlainObject(el);
          fn({
            value: el,
            key: key,
            index: j,
            location: [...location, ...[j]],
            parent: obj,
            isLeaf: isLeaf
          });
          if (!isLeaf) {
            walk(el, j, el, key ? [...location, ...[key], ...[j]] : [...location, ...[j]])
          }
        })
      } else if (_.isPlainObject(obj)) {
        _.keys(obj).forEach(_key => {
          let isLeaf = !_.isArray(obj[_key]) && !_.isPlainObject(obj[_key]);
          fn({
            value: obj[_key],
            key: _key,
            parent: obj,
            index: null,
            location: [...location, ...[_key]],
            isLeaf: isLeaf
          });
          if (!isLeaf) {
            walk(obj[_key], obj, _key, [...location, ...[_key]])
          }
        })
      } else {
        fn({
          value: obj,
          key: key,
          parent: parent,
          index: null,
          location: [...location],
          isLeaf: true
        })
      }
    }

    walk(root)
  }


}
