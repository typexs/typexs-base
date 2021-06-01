import {IStorage} from '../../../libs/storage/IStorage';
import {useContainer} from 'typeorm';
import {DefaultSchemaHandler} from './DefaultSchemaHandler';
import {__DEFAULT__, K_CLS_STORAGE_SCHEMAHANDLER} from '../../../libs/Constants';
import {IStorageOptions} from '../../../libs/storage/IStorageOptions';
import {AbstractSchemaHandler} from '../../../libs/storage/AbstractSchemaHandler';
import * as _ from 'lodash';
import {TypeOrmStorageRef} from '../../../libs/storage/framework/typeorm/TypeOrmStorageRef';
import {Injector} from '../../../libs/di/Injector';
import {TypeOrmEntityRegistry} from '../../../libs/storage/framework/typeorm/schema/TypeOrmEntityRegistry';
import {IRuntimeLoader} from '../../../libs/core/IRuntimeLoader';
import {ClassType, RegistryFactory} from '@allgemein/schema-api';
import {REGISTRY_TYPEORM} from '../../../libs/storage/framework/typeorm/Constants';

useContainer(Injector.getContainer());

export class TypeOrmStorage implements IStorage {

  private schemaHandler: { [key: string]: Function } = {};

  constructor() {
    this.schemaHandler[__DEFAULT__] = DefaultSchemaHandler;
  }


  getType(): string {
    return 'typeorm';
  }


  create(name: string, options: IStorageOptions & any) {
    const ref = new TypeOrmStorageRef(options);
    let type = __DEFAULT__;
    if (_.has(this.schemaHandler, options.type)) {
      type = options.type;
    }
    const schemaHandler: AbstractSchemaHandler = Reflect.construct(this.schemaHandler[type], [ref]);
    schemaHandler.prepare();
    ref.setSchemaHandler(schemaHandler);
    return ref;
  }


  registerSchemaHandler<T extends AbstractSchemaHandler>(cls: ClassType<T> | Function): T {
    const obj = <AbstractSchemaHandler>Reflect.construct(cls, []);
    if (obj) {
      this.schemaHandler[obj.type] = cls;
    }
    return obj as any;
  }


  /**
   * Implmentation of IStorage.onStartup
   *
   * @param loader
   */
  async prepare(loader: IRuntimeLoader) {
    RegistryFactory.register(REGISTRY_TYPEORM, TypeOrmEntityRegistry);
    RegistryFactory.register(/^typeorm\..*/, TypeOrmEntityRegistry);

    if (loader) {
      const classes = await loader.getClasses(K_CLS_STORAGE_SCHEMAHANDLER);
      for (const cls of classes) {
        this.registerSchemaHandler(cls);
      }
    }
    return true;
  }


  shutdown() {
    TypeOrmEntityRegistry.reset();
  }
}
