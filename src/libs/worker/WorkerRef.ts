import {AbstractRef, IBuildOptions, IEntityRef, IPropertyRef, XS_TYPE_ENTITY} from 'commons-schema-api';
import {ClassUtils} from '@allgemein/base';
import {NotSupportedError} from '@allgemein/base/browser';


export class WorkerRef extends AbstractRef implements IEntityRef {

  constructor(fn: Function = null, options: any = null) {
    super(XS_TYPE_ENTITY, ClassUtils.getClassName(fn), fn);
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


}
