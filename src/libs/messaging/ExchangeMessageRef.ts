import * as _ from 'lodash';
import {AbstractRef, IBuildOptions, IEntityRef, IPropertyRef, XS_TYPE_ENTITY} from 'commons-schema-api/browser';
import {ClassUtils, NotSupportedError} from 'commons-base/browser';
import {AbstractExchange} from './AbstractExchange';
import {Injector} from '../di/Injector';
import {C_EXCHANGE_MESSAGE} from './Constants';


export class ExchangeMessageRef extends AbstractRef implements IEntityRef {

  private exchange: AbstractExchange<any, any> = null;

  private isActive: boolean;

  constructor(fn: Function = null, options: any = null) {
    super(XS_TYPE_ENTITY, ClassUtils.getClassName(fn), fn, C_EXCHANGE_MESSAGE);
    this.setOptions(options || {});
  }


  getExchange() {
    return this.exchange;
  }


  async initExchange(opts: any = {}) {
    if (!_.isUndefined(this.isActive)) {
      return this.exchange;
    }

    if (!this.exchange) {
      const exchange = Injector.get(this.getSourceRef().getClass()) as AbstractExchange<any, any>;
      try {
        await exchange.prepare(opts);
        this.isActive = exchange.isActive();
      } catch (e) {
        this.isActive = false;
      }
      if (this.isActive) {
        this.exchange = exchange;
        Injector.set(this.name, this.exchange);
      }
    }
    return this.exchange;
  }


  build<T>(instance: any, options?: IBuildOptions): T {
    throw new NotSupportedError('create is not supported');
  }


  create<T>(): T {
    throw new NotSupportedError('create is not supported');
  }


  reset() {
    this.exchange = null;
    Injector.set(this.name, null);
  }

  getPropertyRef(name: string): IPropertyRef {
    return undefined;
  }

  getPropertyRefs(): IPropertyRef[] {
    return [];
  }

  id(): string {
    return this.name;
  }


}
