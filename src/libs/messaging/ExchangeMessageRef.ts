import {AbstractRef, IBuildOptions, IEntityRef, IPropertyRef, XS_TYPE_ENTITY} from 'commons-schema-api/browser';
import {ClassUtils} from 'commons-base/browser';
import {AbstractExchange} from './AbstractExchange';
import {Injector} from '../di/Injector';


export class ExchangeMessageRef extends AbstractRef implements IEntityRef {

  private exchange: AbstractExchange<any, any>;


  constructor(fn: Function = null, options: any = null) {
    super(XS_TYPE_ENTITY, ClassUtils.getClassName(fn), fn);
    this.setOptions(options || {});
    this.exchange = Injector.get(fn);
    Injector.set(this.name, this.exchange);
  }


  getExchange() {
    return this.exchange;
  }

  build<T>(instance: any, options?: IBuildOptions): T {
    return undefined;
  }

  create<T>(): T {
    return undefined;
  }

  getPropertyRef(name: string): IPropertyRef {
    return undefined;
  }

  getPropertyRefs(): IPropertyRef[] {
    return [];
  }

  id(): string {
    return '';
  }


}
