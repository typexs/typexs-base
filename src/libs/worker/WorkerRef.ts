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
import {NotSupportedError} from '@allgemein/base';
import {isClassRef} from '@allgemein/schema-api/api/IClassRef';
import {C_WORKERS} from './Constants';

// tslint:disable-next-line:no-empty-interface
export interface IWorkerRefOptions extends IEntityOptions {

}

export class WorkerRef extends AbstractRef implements IEntityRef {

  constructor(options: IWorkerRefOptions) {
    super(METATYPE_ENTITY,
      ClassRef.getClassName(options.target),
      options.target,
      options.namespace ? options.namespace : C_WORKERS);
    this.setOptions(options || {});
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

  isOf(instance: any): boolean {
    throw new NotSupportedError('isOf is not supported');
  }


  getPropertyRefs(): IPropertyRef[] {
    return [];
  }

  id(): string {
    return '';
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

  /**
   * TODO implement
   * @param object
   * @param type
   */
  getRegistry(): ILookupRegistry {
    return RegistryFactory.get(this.namespace);
  }

  getSchemaRefs(): ISchemaRef[] {
    return [];
  }


}
