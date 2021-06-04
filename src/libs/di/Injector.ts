import {Container, ObjectType, ServiceIdentifier, ServiceMetadata, Token} from 'typedi';
import {MissingProvidedServiceTypeError} from 'typedi/error/MissingProvidedServiceTypeError';
import {ServiceNotFoundError} from 'typedi/error/ServiceNotFoundError';
import {ClassType, T_STRING} from '@allgemein/schema-api';

export class Injector {


  get globalContainer() {
    return Container.of(undefined);
  }

  private static __self__: Injector;

  static getContainer() {
    return Container;
  }

  static get<T>(identifier: ServiceIdentifier<T> | string | Token<T> | ObjectType<T> | { service: T }): T {
    return <T>this.$().get(identifier);
  }

  static set<T>(identifier: ServiceIdentifier<T> | string | Token<T> | ObjectType<T> | { service: T }, x: T): T {
    return <T>this.$().set(identifier, x);
  }

  static create<T>(identifier: ServiceIdentifier<T> | ClassType<T>, service?: ServiceMetadata<any, any> | undefined): T {
    return this.$().create(identifier, service);
  }

  static $() {
    if (!this.__self__) {
      this.__self__ = new Injector();
    }
    return this.__self__;
  }

  static remove(...id: any) {
    Container.remove(id);
  }

  static reset(id?: any) {
    Container.reset(id);
  }

  /**
   * Retrieves the service with given name or type from the service container.
   * Optionally, parameters can be passed in case if instance is initialized in the container for the first time.
   */
  get<T>(identifier: ServiceIdentifier<T> | string | Token<T> | ObjectType<T> | { service: T }): T {
    return Container.get(<any>identifier);
  }

  /**
   * Sets a object for given name
   */
  set<T>(identifier: ServiceIdentifier<T> | string | Token<T> | ObjectType<T> | { service: T }, x: T) {
    Container.set(<any>identifier, x);
    return x;
  }

  /**
   * Create a new instance of value
   */
  create<T>(identifier: ServiceIdentifier, service?: ServiceMetadata<any, any> | undefined): T {
    // find if instance of this object already initialized in the container and return it if it is
    if (service && service.value !== undefined) {
      return service.value;
    }

    // if named service was requested and its instance was not found plus there is not type to know what to create,
    // this means service was not pre-registered and we throw an exception
    if ((!service || !service.type) &&
      (!service || !service.factory) &&
      (typeof identifier === T_STRING|| identifier instanceof Token)) {
      throw new ServiceNotFoundError(identifier);
    }

    // at this point we either have type in service registered, either identifier is a target type
    let type;
    if (service && service.type) {
      type = service.type;

    } else if (service && service.id instanceof Function) {
      type = service.id;

    } else if (identifier instanceof Function) {
      type = identifier;

      // } else if (identifier instanceof Object && (identifier as { service: Token<any> }).service instanceof Token) {
      //     type = (identifier as { service: Token<any> }).service;
    }

    // if service was not found then create a new one and register it
    if (!service) {
      if (!type) {
        throw new MissingProvidedServiceTypeError(identifier);
      }

      service = {type: type};
    }

    // setup constructor parameters for a newly initialized service
    const paramTypes = type && Reflect && (Reflect as any).getMetadata ? (Reflect as any)
      .getMetadata('design:paramtypes', type) : undefined;
    let params: any[] = paramTypes ? this.initializeParams(type, paramTypes) : [];

    // if factory is set then use it to create service instance
    let value: any;
    if (service.factory) {

      // filter out non-service parameters from created service constructor
      // non-service parameters can be, lets say Car(name: string, isNew: boolean, engine: Engine)
      // where name and isNew are non-service parameters and engine is a service parameter
      params = params.filter(param => param !== undefined);

      if (service.factory instanceof Array) {
        // use special [Type, "create"] syntax to allow factory services
        // in this case Type instance will be obtained from Container and its method "create" will be called
        value = (this.get(service.factory[0]) as any)[service.factory[1]](...params);

      } else { // regular factory function
        value = service.factory(...params, this);
      }

    } else {  // otherwise simply create a new object instance
      if (!type) {
        throw new MissingProvidedServiceTypeError(identifier);
      }

      params.unshift(null);

      // "extra feature" - always pass container instance as the last argument to the service function
      // this allows us to support javascript where we don't have decorators and emitted metadata about dependencies
      // need to be injected, and user can use provided container to get instances he needs
      params.push(this);

      value = new (type.bind.apply(type, params))();
    }

    if (service && !service.transient && value) {
      service.value = value;
    }

    if (type) {
      this.applyPropertyHandlers(type, value);
    }

    return value;
  }

  /**
   * Initializes all parameter types for a given target service class.
   */
  private initializeParams(type: Function, paramTypes: any[]): any[] {
    return paramTypes.map((paramType, index) => {
      const paramHandler = Container.handlers.find(handler => handler.object === type && handler.index === index);
      if (paramHandler) {
        return paramHandler.value(this.globalContainer);
      }

      if (paramType && paramType.name && !this.isTypePrimitive(paramType.name)) {
        return this.get(paramType);
      }

      return undefined;
    });
  }

  /**
   * Checks if given type is primitive (e.g. string, boolean, number, object).
   */
  private isTypePrimitive(param: string): boolean {
    return ['string', 'boolean', 'number', 'object'].indexOf(param.toLowerCase()) !== -1;
  }

  /**
   * Applies all registered handlers on a given target class.
   */
  private applyPropertyHandlers(target: Function, instance: { [key: string]: any }) {
    Container.handlers.forEach(handler => {
      if (typeof handler.index === 'number') {
        return;
      }
      if (handler.object.constructor !== target && !(target.prototype instanceof handler.object.constructor)) {
        return;
      }

      instance[handler.propertyName] = handler.value(this.globalContainer);
    });
  }

}
