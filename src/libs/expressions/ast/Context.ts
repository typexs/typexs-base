import * as _ from 'lodash';

export class Context {

  key: string | number;

  data: { [k: string]: any } = {};

  constructor(k?: string | number) {
    this.key = k;
  }

  /**
   * check if some context is set
   *
   * @param ctxt
   */
  has(ctxt: string) {
    return _.has(this.data, ctxt);
  }


  /**
   * get context value
   *
   * @param k
   */
  get(k?: string) {
    if (k) {
      return _.get(this.data, k, null);
    }
    return this.data;
  }


  /**
   * set a context value
   *
   * @param k
   * @param value
   */
  set(k: string, value: any) {
    if (!this.has(k)) {
      this.data[k] = _.isObjectLike(value) ? {} : null;
    }
    if (_.isObjectLike()) {
      this.data[k] = _.assign(this.data[k], value);
    } else {
      this.data[k] = value;
    }

  }


  merge(ctx: Context) {
    this.data = _.merge(this.data, ctx.data);
  }

}
