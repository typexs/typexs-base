import * as _ from 'lodash';

export class ClassUtils {

  static getClassName(klass: string | Function) {
    if (_.isString(klass)) {
      return klass;
    } else if (_.isFunction(klass)) {
      return klass.name;
    } else if (_.isObject(klass)) {
      return klass.constructor.name;
    } else {
      throw new Error('class not found!');
    }
  }

  static getFunction(klass: string | Function) {
    if (_.isString(klass)) {
      // TODO create error class

      throw new Error('class not found! 02');
    } else if (_.isFunction(klass)) {
      return klass;
    } else if (_.isObject(klass)) {
      return klass.constructor;
    } else {
      // TODO create error class
      throw new Error('class not found! 01');
    }
  }
}
