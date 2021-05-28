import {defaults, get, has, isArray, isEmpty, keys, map, remove} from 'lodash';
import {ISaveOp} from '../ISaveOp';
import {ISaveOptions} from '../ISaveOptions';
import {TypeOrmUtils} from './TypeOrmUtils';
import {ObjectsNotValidError} from '../../../exceptions/ObjectsNotValidError';
import {TypeOrmEntityRegistry} from './schema/TypeOrmEntityRegistry';
import {StorageApi} from '../../../../api/Storage.api';
import {TypeOrmEntityController} from './TypeOrmEntityController';
import {DataContainer, IEntityRef} from '@allgemein/schema-api';
import {convertPropertyValueJsonToString, convertPropertyValueStringToJson} from './Helper';


const saveOptionsKeys = ['data', 'listeners', 'transaction', 'chunk', 'reload'];

export class SaveOp<T> implements ISaveOp<T> {

  error: Error = null;

  readonly controller: TypeOrmEntityController;

  protected options: ISaveOptions;

  protected objects: T[] = [];

  protected isArray: boolean = true;


  constructor(controller: TypeOrmEntityController) {
    this.controller = controller;
  }

  getOptions() {
    return this.options;
  }

  getObjects() {
    return this.objects;
  }

  getIsArray() {
    return this.isArray;
  }

  private isMongoDB() {
    return this.controller.storageRef.dbType === 'mongodb';
  }

  async run(object: T[] | T, options?: ISaveOptions): Promise<T[] | T> {
    defaults(options, {validate: false, raw: false});
    this.options = options;
    this.isArray = isArray(object);
    this.objects = this.prepare(object);

    const jsonPropertySupport = this.controller.storageRef.getSchemaHandler().supportsJson();

    await this.controller.invoker.use(StorageApi).doBeforeSave(this.objects, this);

    let objectsValid = true;
    if (get(options, 'validate', false)) {
      objectsValid = await this.validate();
    }

    const saveOptions = {};
    saveOptionsKeys.filter(k => has(this.options, k)).map(k => {
      saveOptions[k] = this.options[k];
    });

    if (objectsValid) {
      const promises: Promise<any>[] = [];
      const resolveByEntityRef = TypeOrmUtils.resolveByEntityRef(this.objects);
      const entityNames = keys(resolveByEntityRef);

      // load before connect
      const refs: { [k: string]: IEntityRef } = {};
      for (const entityName of entityNames) {
        refs[entityName] = this.controller.getStorageRef().getRegistry().getEntityRefFor(entityName);
        // await this.controller.invoker.use(StorageApi).prepareEntities(this.objects, this);
        if (!jsonPropertySupport) {
          convertPropertyValueJsonToString(refs[entityName], resolveByEntityRef[entityName]);
        }
      }

      const connection = await this.controller.connect();
      try {
        if (this.isMongoDB()) {

          for (const entityName of entityNames) {
            const repo = connection.manager.getMongoRepository(entityName);
            const entityDef = refs[entityName];
            const idPropertyRefs = entityDef.getPropertyRefs().filter(p => p.isIdentifier());
            if (idPropertyRefs.length === 0) {
              throw new Error('no id property found for ' + entityName);
            }
            const _idRef = remove(idPropertyRefs, x => x.name === '_id').shift();

            resolveByEntityRef[entityName].forEach((entity: any) => {
              // if no _id is set then generate one
              if (!entity._id) {
                entity._id = idPropertyRefs.map(x => get(entity, x.name)).join('--');
                if (isEmpty(entity._id)) {
                  throw new Error('no id could be generate for ' + entityName + ' with properties ' + idPropertyRefs.map(x => x.name).join(', '));
                }
              }
              keys(entity).filter(x => /^$/.test(x)).map(x => delete entity[x]);
            });

            if (options.raw) {
              const bulk = repo.initializeOrderedBulkOp();
              resolveByEntityRef[entityName].forEach((entity: any) => {
                // filter command values
                bulk.find({_id: entity._id}).upsert().replaceOne(entity);
              });
              promises.push(bulk.execute());
            } else {
              const p = repo.save(resolveByEntityRef[entityName], saveOptions)
                .then((x: any) => {
                  resolveByEntityRef[entityName].forEach((entity: any) => {
                    if (!entity._id) {
                      entity._id = idPropertyRefs.map(x => get(entity, x.name)).join('--');
                    }
                  });
                });
              promises.push(p);
            }
          }

        } else {
          // start transaction, got to leafs and save
          if (connection.isSingleConnection()) {
            options.noTransaction = true;
          }

          if (options.noTransaction) {
            for (const entityName of entityNames) {
              const p = connection.manager.getRepository(entityName).save(resolveByEntityRef[entityName], saveOptions);
              promises.push(p);
            }
          } else {

            const promise = connection.manager.transaction(async em => {
              const _promises = [];
              for (const entityName of entityNames) {
                // convert sub-objects to string
                if (!jsonPropertySupport) {
                  convertPropertyValueStringToJson(refs[entityName], resolveByEntityRef[entityName]);
                }
                const p = em.getRepository(entityName).save(resolveByEntityRef[entityName], saveOptions);
                _promises.push(p);
              }
              return Promise.all(_promises);
            });
            promises.push(promise);
          }
        }

        if (promises.length > 0) {
          await Promise.all(promises);
        }


      } catch (e) {
        this.error = e;
      } finally {
        await connection.close();
      }

      if (!jsonPropertySupport) {
        for (const entityName of entityNames) {
          convertPropertyValueStringToJson(refs[entityName], resolveByEntityRef[entityName]);
        }
      }

    } else {
      this.error = new ObjectsNotValidError(this.objects, this.isArray);
    }


    const result = this.isArray ? this.objects : this.objects.shift();
    await this.controller.invoker.use(StorageApi).doAfterSave(result, this.error, this);

    if (this.error) {
      throw this.error;
    }

    return result;
  }


  prepare(object: T | T[]): T[] {
    let objs: T[] = [];
    if (isArray(object)) {
      objs = object;
    } else {
      objs.push(object);
    }
    return objs;
  }


  private async validate() {
    let valid = true;
    await Promise.all(map(this.objects, o => new DataContainer(o, TypeOrmEntityRegistry.$())).map(async c => {
      valid = valid && await c.validate();
      if (!this.isMongoDB()) {
        c.applyState();
      }
    }));
    return valid;
  }


}
