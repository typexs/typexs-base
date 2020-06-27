import {IStorage} from '../../../libs/storage/IStorage';
import {getMetadataArgsStorage, useContainer} from 'typeorm';
import {TableMetadataArgs} from 'typeorm/metadata-args/TableMetadataArgs';
import {DefaultSchemaHandler} from './DefaultSchemaHandler';
import {__DEFAULT__, K_CLS_STORAGE_SCHEMAHANDLER} from '../../../libs/Constants';
import {IStorageOptions} from '../../../libs/storage/IStorageOptions';
import {RuntimeLoader} from '../../../base/RuntimeLoader';
import {AbstractSchemaHandler} from '../../../libs/storage/AbstractSchemaHandler';
import * as _ from 'lodash';
import {TypeOrmStorageRef} from '../../../libs/storage/framework/typeorm/TypeOrmStorageRef';
import {Injector} from '../../../libs/di/Injector';

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
    const tables: TableMetadataArgs[] = getMetadataArgsStorage().tables;
    options.entities = tables
      .filter(t => options.entities.indexOf(<Function>t.target) !== -1)
      .map(t => <Function>t.target);


    const ref = new TypeOrmStorageRef(options);

    let type = __DEFAULT__;
    if (_.has(this.schemaHandler, options.type)) {
      type = options.type;
    }
    const schemaHandler = Reflect.construct(this.schemaHandler[type], [ref]);
    schemaHandler.prepare();
    ref.setSchemaHandler(schemaHandler);

    return ref;
  }

  /**
   * Implmentation of IStorage.prepare
   *
   * @param loader
   */
  async prepare(loader: RuntimeLoader) {
    const classes = await loader.getClasses(K_CLS_STORAGE_SCHEMAHANDLER);
    for (const cls of classes) {
      const obj = <AbstractSchemaHandler>Reflect.construct(cls, []);
      if (obj) {
        this.schemaHandler[obj.type] = cls;
      }
    }
    return Promise.resolve(true);
  }
}
