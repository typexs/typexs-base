import * as _ from 'lodash';

export class MetaArgs {

  static $self: MetaArgs;

  [k: string]: any;

  static $() {
    if (!this.$self) {
      this.$self = new MetaArgs()
    }
    return this.$self;
  }


  _key(k: string): any[] {
    if (!_.has(this,k)) {
      this[k] = []
    }
    return this[k];
  }


  static key(k: string): any[] {
    return this.$()._key(k);
  }


  static clear() {
    this.$self = null;
  }

}
