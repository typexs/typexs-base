import {get, isUndefined} from 'lodash';
import {
  AbstractRef,
  ClassRef,
  IBuildOptions,
  IClassRef,
  IEntityOptions,
  IEntityRef,
  ILookupRegistry,
  IPropertyRef,
  ISchemaRef,
  METADATA_TYPE,
  METATYPE_ENTITY,
  METATYPE_PROPERTY,
  RegistryFactory
} from '@allgemein/schema-api';
import {ClassUtils, NotSupportedError} from '@allgemein/base';
import {AbstractExchange} from './AbstractExchange';
import {Injector} from '../di/Injector';
import {C_EXCHANGE_MESSAGE} from './Constants';
import {isClassRef} from '@allgemein/schema-api/api/IClassRef';


// tslint:disable-next-line:no-empty-interface
export interface IExchangeMessageRefOptions extends IEntityOptions {

}

export class ExchangeMessageRef extends AbstractRef implements IEntityRef {

  private exchange: AbstractExchange<any, any> = null;

  private isActive: boolean;

  constructor(options: IExchangeMessageRefOptions) {
    super(METATYPE_ENTITY,
      ClassUtils.getClassName(options.target),
      options.target,
      get(options, 'namespace', C_EXCHANGE_MESSAGE));
    this.setOptions(options || {});
  }


  getExchange() {
    return this.exchange;
  }


  async initExchange(opts: any = {}) {
    if (!isUndefined(this.isActive)) {
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

  isOf(instance: any): boolean {
    throw new NotSupportedError('isOf is not supported');
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


  /**
   * TODO implement
   *
   * @param object
   * @param type
   */
  getRegistry(): ILookupRegistry {
    return RegistryFactory.get(this.namespace);
  }

  /**
   * TODO implement
   *
   * @param object
   * @param type
   */
  getSchemaRefs(): ISchemaRef[] {
    return [];
  }

  /**
   * Return a class ref for passing string, Function or class ref
   *
   * @param object
   * @param type
   */
  getClassRefFor(object: string | Function | IClassRef, type: METADATA_TYPE): IClassRef {
    if (isClassRef(object)) {
      return object;
    }
    return ClassRef.get(object as string | Function, this.namespace, type === METATYPE_PROPERTY);
  }


}
